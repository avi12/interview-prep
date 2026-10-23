type Symbols = {
  constants: Map<string, string>;
  tables: Map<string, string[]>;
};

type Call = {
  position: number;
  method: string;
  expression: string;
};

const DEFAULT_METHOD = "GET";
const IDENTIFIER = String.raw`[A-Za-z_$][\w$]*`;
const STRING_CONSTANT = new RegExp(String.raw`(${IDENTIFIER})="([^"]*)"`, "g");
const STRING_TABLE = new RegExp(String.raw`(${IDENTIFIER})=\[("[^"]*"(?:,"[^"]*")*)\]`, "g");
const QUOTED_STRING = /"([^"]*)"/g;
const URL_TERM = new RegExp(String.raw`"[^"]*"|${IDENTIFIER}(?:\[\d+\])?`, "g");
const TABLE_LOOKUP = new RegExp(String.raw`^(${IDENTIFIER})\[(\d+)\]$`);
const FETCH_CALL = /\bfetch\(([^,)]*)(?:,([^)]*))?\)/g;
const XHR_OPEN = /\.open\("(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)",([^,)]*)/gi;
const METHOD_OPTION = /method:"(\w+)"/;

function stringsIn(text: string) {
  return [...text.matchAll(QUOTED_STRING)].map(([, value]) => value);
}

function readSymbols(source: string): Symbols {
  return {
    constants: new Map([...source.matchAll(STRING_CONSTANT)].map(([, name, value]) => [name, value])),
    tables: new Map([...source.matchAll(STRING_TABLE)].map(([, name, items]) => [name, stringsIn(items)]))
  };
}

function resolveTerm({ term, symbols }: {
  term: string;
  symbols: Symbols;
}) {
  if (term.startsWith("\"")) {
    return term.slice(1, -1);
  }

  const lookup = TABLE_LOOKUP.exec(term);
  const tableEntry = lookup ? symbols.tables.get(lookup[1])?.[Number(lookup[2])] : undefined;
  return tableEntry ?? symbols.constants.get(term) ?? `{${term}}`;
}

function resolveUrl({ expression, symbols }: {
  expression: string;
  symbols: Symbols;
}) {
  return (expression.match(URL_TERM) ?? []).map(term => resolveTerm({
    term,
    symbols
  })).join("");
}

function fetchCalls(source: string): Call[] {
  return [...source.matchAll(FETCH_CALL)].map(match => ({
    position: match.index,
    method: METHOD_OPTION.exec(match[2] ?? "")?.[1] ?? DEFAULT_METHOD,
    expression: match[1]
  }));
}

function xhrCalls(source: string): Call[] {
  return [...source.matchAll(XHR_OPEN)].map(match => ({
    position: match.index,
    method: match[1],
    expression: match[2]
  }));
}

export function extractEndpoints(source: string) {
  const symbols = readSymbols(source);
  return [...fetchCalls(source), ...xhrCalls(source)]
    .sort((first, second) => first.position - second.position)
    .map(({ method, expression }) => ({
      method: method.toUpperCase(),
      url: resolveUrl({
        expression,
        symbols
      })
    }));
}
