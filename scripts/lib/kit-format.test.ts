import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import { formatValue, oneLine } from "#kit/calls.ts";

const NODE_OPTIONS = {
  compact: false,
  depth: 3,
  maxArrayLength: 12,
  maxStringLength: 60
};
const LONG_TEXT_LENGTH = 75;
const LONG_LIST_LENGTH = 20;
const DEEP_NESTING = 6;

class Point {
  x = 1;
  y = 2;
}

class Empty {}

function nested(levels: number) {
  if (levels === 0) {
    return 1;
  }

  const inner: unknown = nested(levels - 1);
  return [inner];
}

const SAMPLES: [string, unknown][] = [
  ["a number", 42],
  ["negative zero", -0],
  ["a bigint", 12n],
  ["a plain string", "hello"],
  ["a string with a single quote", "it's"],
  ["a string with both quotes", 'it\'s "so"'],
  ["a string with every quote", 'it\'s "so" `x`'],
  ["a string with control characters", "a\nb\tc\u0001"],
  ["a long string", "x".repeat(LONG_TEXT_LENGTH)],
  ["booleans and nothing", [true, false, null, undefined]],
  ["an empty array", []],
  ["an empty object", {}],
  ["a flat array", [1, 2, 3]],
  ["a long array", Array.from({ length: LONG_LIST_LENGTH }, (_, index) => index)],
  ["nested arrays", [[1, [2, [3]]], []]],
  ["deep nesting", nested(DEEP_NESTING)],
  [
    "deep objects",
    {
      a: {
        b: {
          c: {
            d: {
              e: 1
            }
          }
        }
      }
    }
  ],
  [
    "deep empty containers",
    {
      a: {
        b: {
          c: {
            d: [],
            e: {}
          }
        }
      }
    }
  ],
  [
    "objects with odd keys",
    {
      plain: 1,
      "with-dash": 2,
      $dollar: 3,
      "1digit": 4
    }
  ],
  ["a class instance", new Point()],
  ["an empty class instance", new Empty()],
  ["a null prototype object", Object.assign(Object.create(null), { a: 1 })],
  [
    "a map",
    new Map([
      ["a", 1],
      ["b", 2]
    ])
  ],
  ["an empty set", new Set()],
  ["a set", new Set([1, "two"])],
  ["a date", new Date(Date.UTC(2024, 0, 2))],
  ["a regexp", /ab+c/gi],
  [
    "a named function",
    function named() {
      return 1;
    }
  ],
  ["an arrow function", [() => 1]],
  ["a class", Point],
  ["a typed array", new Uint8Array([1, 2, 3])],
  ["a symbol", Symbol("tag")],
  [
    "a getter",
    Object.defineProperty({}, "value", {
      get: () => 1,
      enumerable: true
    })
  ],
  [
    "mixed records",
    [
      {
        id: 1,
        tags: ["a", "b"],
        owner: {
          name: "Ada",
          roles: new Set(["admin"])
        }
      }
    ]
  ]
];

describe("the kit formatter", () => {
  it.each(SAMPLES)("formats %s the way node:util inspect does", (_, value) => {
    expect(formatValue(value)).toBe(oneLine(inspect(value, NODE_OPTIONS)));
  });
});
