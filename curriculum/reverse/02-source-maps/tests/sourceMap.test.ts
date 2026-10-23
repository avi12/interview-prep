import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createSeededPicker } from "#kit/random.ts";
import type { Segment, SourceMap } from "../starter/sourceMap.ts";

type Position = { source: string; line: number; column: number; name: string | null } | null;
type Module = {
  decodeMappings: (mappings: string) => Segment[][];
  originalPositionFor: (input: { sourceMap: SourceMap; generatedLine: number; generatedColumn: number }) => Position;
};

const { decodeMappings, originalPositionFor } = await loadImpl<Module>({ testUrl: import.meta.url, file: "sourceMap.ts" });

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const RANDOM_SEED = 20261019;
const RANDOM_LINE_COUNT = 40;
const DIGIT_MASK = 0b11111;
const CONTINUATION_BIT = 0b100000;

const segment = (...fields: number[]): Segment => ({
  generatedColumn: fields[0],
  sourceIndex: fields[1] ?? null,
  originalLine: fields[2] ?? null,
  originalColumn: fields[3] ?? null,
  nameIndex: fields[4] ?? null
});

const encodeValue = (value: number) => {
  let remaining = value < 0 ? (-value << 1) | 1 : value << 1;
  let encoded = "";
  do {
    let digit = remaining & DIGIT_MASK;
    remaining >>>= 5;
    if (remaining > 0) digit |= CONTINUATION_BIT;
    encoded += BASE64_ALPHABET[digit];
  } while (remaining > 0);
  return encoded;
};

const encodeMappings = (lines: Segment[][]) => {
  const previous = { sourceIndex: 0, originalLine: 0, originalColumn: 0, nameIndex: 0 };
  return lines
    .map(line => {
      let previousColumn = 0;
      return line
        .map(({ generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex }) => {
          const fields = [generatedColumn - previousColumn];
          previousColumn = generatedColumn;
          if (sourceIndex !== null) {
            fields.push(sourceIndex - previous.sourceIndex, originalLine! - previous.originalLine, originalColumn! - previous.originalColumn);
            Object.assign(previous, { sourceIndex, originalLine, originalColumn });
          }
          if (nameIndex !== null) {
            fields.push(nameIndex - previous.nameIndex);
            previous.nameIndex = nameIndex;
          }
          return fields.map(encodeValue).join("");
        })
        .join(",");
    })
    .join(";");
};

const randomLines = () => {
  const pick = createSeededPicker(RANDOM_SEED);
  return Array.from({ length: RANDOM_LINE_COUNT }, () => {
    let column = 0;
    return Array.from({ length: pick(6) }, () => {
      column += pick(700);
      const kind = pick(3);
      if (kind === 0) return segment(column);
      if (kind === 1) return segment(column, pick(3), pick(3000), pick(900));
      return segment(column, pick(3), pick(3000), pick(900), pick(50));
    });
  });
};

const GREET_MAP: SourceMap = {
  version: 3,
  sources: ["src/greet.ts"],
  names: ["greet", "name"],
  mappings: "AAAAA,SAASA,EAAMC,GACb,MAAO,WAAWA"
};

describe("decodeMappings", () => {
  it("decodes a two-line map by hand-checked values", () => {
    expect(decodeMappings("AAAA,IAAM;AACA")).toEqual([
      [segment(0, 0, 0, 0), segment(4, 0, 0, 6)],
      [segment(0, 0, 1, 6)]
    ]);
  });

  it("decodes values that need more than one Base64 digit", () => {
    expect(decodeMappings("iB")).toEqual([[segment(17)]]);
    expect(decodeMappings("iB,hB")).toEqual([[segment(17), segment(1)]]);
    expect(decodeMappings("V")).toEqual([[segment(-10)]]);
  });

  it("decodes negative values", () => {
    expect(decodeMappings("KAAK,DAAD")).toEqual([[segment(5, 0, 0, 5), segment(4, 0, 0, 4)]]);
  });

  it("reads a segment with one field as unmapped", () => {
    expect(decodeMappings("C")).toEqual([[segment(1)]]);
  });

  it("reads the fifth field as a name index relative to the previous name", () => {
    expect(decodeMappings("AAAAA;AAAAC")).toEqual([[segment(0, 0, 0, 0, 0)], [segment(0, 0, 0, 0, 1)]]);
  });

  it("keeps an empty line as an empty list", () => {
    expect(decodeMappings("AAAA;;AACA")).toEqual([[segment(0, 0, 0, 0)], [], [segment(0, 0, 1, 0)]]);
  });

  it("resets the generated column on every line but carries the other fields over", () => {
    expect(decodeMappings("EAAE;EAAE")).toEqual([[segment(2, 0, 0, 2)], [segment(2, 0, 0, 4)]]);
  });

  it("round-trips 40 random lines with large and negative jumps", () => {
    const lines = randomLines();
    expect(decodeMappings(encodeMappings(lines))).toEqual(lines);
  });

  it("rejects a character outside the Base64 alphabet", () => {
    expect(() => decodeMappings("AA!A")).toThrow();
  });

  it("rejects a segment with two or three fields", () => {
    expect(() => decodeMappings("AA")).toThrow();
    expect(() => decodeMappings("AAA")).toThrow();
  });
});

describe("originalPositionFor", () => {
  const lookup = (generatedColumn: number, generatedLine = 0, sourceMap = GREET_MAP) =>
    originalPositionFor({ sourceMap, generatedLine, generatedColumn });

  it("maps a position that starts a segment", () => {
    expect(lookup(14)).toEqual({ source: "src/greet.ts", line: 1, column: 2, name: null });
  });

  it("maps a position inside a segment to the start of that segment", () => {
    expect(lookup(17)).toEqual({ source: "src/greet.ts", line: 1, column: 2, name: null });
  });

  it("returns the name of a named segment", () => {
    expect(lookup(9)).toEqual({ source: "src/greet.ts", line: 0, column: 9, name: "greet" });
    expect(lookup(11)).toEqual({ source: "src/greet.ts", line: 0, column: 15, name: "name" });
  });

  it("lets the last segment of a line cover the rest of the line", () => {
    expect(lookup(500)).toEqual({ source: "src/greet.ts", line: 1, column: 20, name: "name" });
  });

  it("returns null for a line that does not exist", () => {
    expect(lookup(3, 7)).toBeNull();
  });

  it("returns null for an empty line", () => {
    expect(lookup(3, 1, { ...GREET_MAP, mappings: "AAAA;;AACA" })).toBeNull();
  });

  it("returns null when the column is before the first segment", () => {
    expect(lookup(2, 0, { ...GREET_MAP, mappings: "KAAA" })).toBeNull();
  });

  it("returns null for an unmapped segment", () => {
    expect(lookup(1, 0, { ...GREET_MAP, mappings: "C,GAAA" })).toBeNull();
  });

  it("picks the right file and line on another map", () => {
    const sourceMap: SourceMap = {
      version: 3,
      sources: ["src/a.ts", "src/b.ts"],
      names: [],
      mappings: "AAAA;IACA,KCCE;AACA"
    };
    expect(originalPositionFor({ sourceMap, generatedLine: 1, generatedColumn: 4 })).toEqual({ source: "src/a.ts", line: 1, column: 0, name: null });
    expect(originalPositionFor({ sourceMap, generatedLine: 1, generatedColumn: 9 })).toEqual({ source: "src/b.ts", line: 2, column: 2, name: null });
    expect(originalPositionFor({ sourceMap, generatedLine: 2, generatedColumn: 0 })).toEqual({ source: "src/b.ts", line: 3, column: 2, name: null });
  });
});
