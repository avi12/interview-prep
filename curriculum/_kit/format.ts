export type FormatLimits = {
  depth: number;
  maxArrayLength: number;
  maxStringLength: number;
};

type Context = {
  limits: FormatLimits;
  level: number;
  seen: Set<object>;
};

const CUSTOM_INSPECT = Symbol.for("nodejs.util.inspect.custom");
const PLAIN_OBJECT_NAME = "Object";
const NULL_PROTOTYPE_PREFIX = "[Object: null prototype] ";
const PLAIN_KEY = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = "\"";
const BACKTICK = "`";
const TEMPLATE_START = "${";
const CLASS_SOURCE = /^class\b/;
const CLASS_HERITAGE = /^class\s+[\w$]*\s*extends\s+([\w$.]+)/;
const HEX_RADIX = 16;
const BYTE_HEX_WIDTH = 2;
const CONTROL_LIMIT = 0x20;
const DELETE_CODE = 0x7f;
const NAMED_ESCAPES: Record<string, string> = {
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\v": "\\x0B",
  "\f": "\\f",
  "\r": "\\r",
  "\\": "\\\\"
};
const FUNCTION_KINDS: Record<string, string> = {
  AsyncFunction: "AsyncFunction",
  GeneratorFunction: "GeneratorFunction",
  AsyncGeneratorFunction: "AsyncGeneratorFunction"
};

function plural({ count, word }: {
  count: number;
  word: string;
}) {
  return `${count} more ${word}${count > 1 ? "s" : ""}`;
}

function quoteOf(text: string) {
  if (!text.includes(SINGLE_QUOTE)) {
    return SINGLE_QUOTE;
  }

  if (!text.includes(DOUBLE_QUOTE)) {
    return DOUBLE_QUOTE;
  }

  return text.includes(BACKTICK) || text.includes(TEMPLATE_START) ? SINGLE_QUOTE : BACKTICK;
}

function escapedChar({ char, quote }: {
  char: string;
  quote: string;
}) {
  if (char === quote) {
    return `\\${char}`;
  }

  const named = NAMED_ESCAPES[char];
  if (named) {
    return named;
  }

  const code = char.charCodeAt(0);
  if (code < CONTROL_LIMIT || code === DELETE_CODE) {
    return `\\x${code.toString(HEX_RADIX).toUpperCase().padStart(BYTE_HEX_WIDTH, "0")}`;
  }

  return char;
}

function quoted(text: string) {
  const quote = quoteOf(text);
  let body = "";
  for (const char of text) {
    body += escapedChar({
      char,
      quote
    });
  }
  return `${quote}${body}${quote}`;
}

function formatString({ text, limits }: {
  text: string;
  limits: FormatLimits;
}) {
  const extra = text.length - limits.maxStringLength;
  if (extra <= 0) {
    return quoted(text);
  }

  return `${quoted(text.slice(0, limits.maxStringLength))}... ${plural({
    count: extra,
    word: "character"
  })}`;
}

function formatFunction(value: Function) {
  const source = Function.prototype.toString.call(value);
  if (CLASS_SOURCE.test(source)) {
    const heritage = CLASS_HERITAGE.exec(source)?.[1];
    return `[class ${value.name || "(anonymous)"}${heritage ? ` extends ${heritage}` : ""}]`;
  }

  const kind = FUNCTION_KINDS[value.constructor?.name ?? ""] ?? "Function";
  return value.name ? `[${kind}: ${value.name}]` : `[${kind} (anonymous)]`;
}

function constructorNameOf(value: object) {
  const prototype: object | null = Object.getPrototypeOf(value);
  if (prototype === null) {
    return null;
  }

  const name: unknown = typeof prototype.constructor === "function" ? prototype.constructor.name : undefined;
  return typeof name === "string" && name !== "" ? name : PLAIN_OBJECT_NAME;
}

function keyText(key: string | symbol) {
  if (typeof key === "symbol") {
    return `[${key.toString()}]`;
  }

  return PLAIN_KEY.test(key) ? key : quoted(key);
}

function braced({ prefix, items, open, close }: {
  prefix: string;
  items: string[];
  open: string;
  close: string;
}) {
  if (items.length === 0) {
    return `${prefix}${open}${close}`;
  }

  return `${prefix}${open} ${items.join(", ")} ${close}`;
}

function limited({ items, total, limits }: {
  items: string[];
  total: number;
  limits: FormatLimits;
}) {
  const extra = total - limits.maxArrayLength;
  if (extra <= 0) {
    return items;
  }

  return [
    ...items.slice(0, limits.maxArrayLength),
    `... ${plural({
      count: extra,
      word: "item"
    })}`
  ];
}

function accessorText(descriptor: PropertyDescriptor) {
  if (descriptor.get && descriptor.set) {
    return "[Getter/Setter]";
  }

  return descriptor.get ? "[Getter]" : "[Setter]";
}

function objectPrefix(name: string | null) {
  if (name === null) {
    return NULL_PROTOTYPE_PREFIX;
  }

  return name === PLAIN_OBJECT_NAME ? "" : `${name} `;
}

function isNumberView(value: object): value is ArrayBufferView & ArrayLike<number> {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

function propertyEntries({ value, context }: {
  value: object;
  context: Context;
}) {
  const keys: (string | symbol)[] = [
    ...Object.keys(value),
    ...Object.getOwnPropertySymbols(value).filter(symbol => Object.prototype.propertyIsEnumerable.call(value, symbol))
  ];
  return keys.map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && !("value" in descriptor)) {
      return `${keyText(key)}: ${accessorText(descriptor)}`;
    }

    return `${keyText(key)}: ${formatChild({
      value: descriptor?.value,
      context
    })}`;
  });
}

function formatChild({ value, context }: {
  value: unknown;
  context: Context;
}) {
  return formatAny({
    value,
    context: {
      ...context,
      level: context.level + 1
    }
  });
}

function bytesText(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(HEX_RADIX).padStart(BYTE_HEX_WIDTH, "0")).join(" ");
}

function isEmptyContainer(value: object) {
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return Object.keys(value).length === 0 && Object.getOwnPropertySymbols(value).length === 0;
}

function depthMarker({ value, name }: {
  value: object;
  name: string | null;
}) {
  if (name === null) {
    return "[Object: null prototype]";
  }

  return Array.isArray(value) && name === "Array" ? "[Array]" : `[${name}]`;
}

function formatCollection({ value, name, context }: {
  value: object;
  name: string | null;
  context: Context;
}) {
  const { limits } = context;
  function child(item: unknown) {
    return formatChild({
      value: item,
      context
    });
  }

  if (value instanceof Map) {
    const shown = [...value].slice(0, limits.maxArrayLength).map(([key, item]) => `${child(key)} => ${child(item)}`);
    return braced({
      prefix: `${name ?? "Map"}(${value.size}) `,
      items: limited({
        items: shown,
        total: value.size,
        limits
      }),
      open: "{",
      close: "}"
    });
  }

  if (value instanceof Set) {
    const shown = [...value].slice(0, limits.maxArrayLength).map(child);
    return braced({
      prefix: `${name ?? "Set"}(${value.size}) `,
      items: limited({
        items: shown,
        total: value.size,
        limits
      }),
      open: "{",
      close: "}"
    });
  }

  if (isNumberView(value)) {
    const view = value;
    const shownLength = Math.min(view.length, limits.maxArrayLength);
    const shown = Array.from({ length: shownLength }, (_, index) => child(view[index]));
    return braced({
      prefix: `${name ?? "TypedArray"}(${view.length}) `,
      items: limited({
        items: shown,
        total: view.length,
        limits
      }),
      open: "[",
      close: "]"
    });
  }

  if (Array.isArray(value)) {
    const shown = value.slice(0, limits.maxArrayLength).map(child);
    return braced({
      prefix: name === "Array" ? "" : `${name ?? "[Array: null prototype]"}(${value.length}) `,
      items: limited({
        items: shown,
        total: value.length,
        limits
      }),
      open: "[",
      close: "]"
    });
  }

  return undefined;
}

function formatObject({ value, context }: {
  value: object;
  context: Context;
}) {
  if (context.seen.has(value)) {
    return "[Circular *1]";
  }

  const custom: unknown = CUSTOM_INSPECT in value ? value[CUSTOM_INSPECT] : undefined;
  if (typeof custom === "function") {
    const shown: unknown = custom.call(value, context.limits.depth - context.level, {});
    if (typeof shown === "string") {
      return shown;
    }
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }

  if (value instanceof RegExp) {
    return String(value);
  }

  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  if (value instanceof ArrayBuffer) {
    return `ArrayBuffer { [Uint8Contents]: <${bytesText(new Uint8Array(value))}>, byteLength: ${value.byteLength} }`;
  }

  if (value instanceof Promise) {
    return "Promise { <pending> }";
  }

  const name = constructorNameOf(value);
  if (context.level > context.limits.depth && !isEmptyContainer(value)) {
    return depthMarker({
      value,
      name
    });
  }

  context.seen.add(value);
  const text = formatCollection({
    value,
    name,
    context
  }) ?? braced({
    prefix: objectPrefix(name),
    items: propertyEntries({
      value,
      context
    }),
    open: "{",
    close: "}"
  });
  context.seen.delete(value);
  return text;
}

function formatAny({ value, context }: {
  value: unknown;
  context: Context;
}): string {
  if (typeof value === "string") {
    return formatString({
      text: value,
      limits: context.limits
    });
  }

  if (typeof value === "number") {
    return Object.is(value, -0) ? "-0" : String(value);
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return formatFunction(value);
  }

  if (typeof value !== "object" || value === null) {
    return String(value);
  }

  return formatObject({
    value,
    context
  });
}

export function formatWithLimits({ value, limits }: {
  value: unknown;
  limits: FormatLimits;
}) {
  return formatAny({
    value,
    context: {
      limits,
      level: 0,
      seen: new Set()
    }
  });
}
