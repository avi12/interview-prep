export type Segment = {
  generatedColumn: number;
  sourceIndex: number | null;
  originalLine: number | null;
  originalColumn: number | null;
  nameIndex: number | null;
};

export type SourceMap = {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
};

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LINE_SEPARATOR = ";";
const SEGMENT_SEPARATOR = ",";
const CONTINUATION_BIT = 0b100000;
const DIGIT_BITS = 5;
const DIGIT_MASK = 0b11111;
const SIGN_MASK = 1;
const FIELDS_UNMAPPED = 1;
const FIELDS_MAPPED = 4;
const FIELDS_NAMED = 5;

function decodeValues(text: string) {
  const values: number[] = [];
  let accumulated = 0;
  let shift = 0;
  for (const character of text) {
    const digit = BASE64_ALPHABET.indexOf(character);
    if (digit < 0) {
      throw new Error(`"${character}" is not a Base64 character`);
    }

    accumulated += (digit & DIGIT_MASK) << shift;

    if (digit & CONTINUATION_BIT) {
      shift += DIGIT_BITS;
      continue;
    }

    const magnitude = accumulated >> 1;
    values.push(accumulated & SIGN_MASK ? 0 - magnitude : magnitude);
    accumulated = 0;
    shift = 0;
  }
  return values;
}

export function decodeMappings(mappings: string) {
  const running = {
    sourceIndex: 0,
    originalLine: 0,
    originalColumn: 0,
    nameIndex: 0
  };
  const lines: Segment[][] = [];
  for (const lineText of mappings.split(LINE_SEPARATOR)) {
    const segments: Segment[] = [];
    let generatedColumn = 0;
    for (const segmentText of lineText.split(SEGMENT_SEPARATOR)) {
      if (segmentText === "") {
        continue;
      }

      const deltas = decodeValues(segmentText);
      if (![FIELDS_UNMAPPED, FIELDS_MAPPED, FIELDS_NAMED].includes(deltas.length)) {
        throw new Error(`a segment has 1, 4 or 5 fields, "${segmentText}" has ${deltas.length}`);
      }

      generatedColumn += deltas[0];

      if (deltas.length === FIELDS_UNMAPPED) {
        segments.push({
          generatedColumn,
          sourceIndex: null,
          originalLine: null,
          originalColumn: null,
          nameIndex: null
        });
        continue;
      }

      running.sourceIndex += deltas[1];
      running.originalLine += deltas[2];
      running.originalColumn += deltas[3];

      if (deltas.length === FIELDS_NAMED) {
        running.nameIndex += deltas[4];
      }

      segments.push({
        generatedColumn,
        sourceIndex: running.sourceIndex,
        originalLine: running.originalLine,
        originalColumn: running.originalColumn,
        nameIndex: deltas.length === FIELDS_NAMED ? running.nameIndex : null
      });
    }
    lines.push(segments);
  }
  return lines;
}

export function originalPositionFor({
  sourceMap,
  generatedLine,
  generatedColumn
}: {
  sourceMap: SourceMap;
  generatedLine: number;
  generatedColumn: number;
}) {
  const segments = decodeMappings(sourceMap.mappings)[generatedLine] ?? [];
  const segment = segments.findLast(candidate => candidate.generatedColumn <= generatedColumn);
  if (!segment || segment.sourceIndex === null || segment.originalLine === null || segment.originalColumn === null) {
    return null;
  }

  return {
    source: sourceMap.sources[segment.sourceIndex],
    line: segment.originalLine,
    column: segment.originalColumn,
    name: segment.nameIndex === null ? null : sourceMap.names[segment.nameIndex]
  };
}
