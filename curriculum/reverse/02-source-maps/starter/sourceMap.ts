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

type OriginalPosition = {
  source: string;
  line: number;
  column: number;
  name: string | null;
};

export function decodeMappings(_mappings: string) {
  const lines: Segment[][] = [];
  return lines;
}

export function originalPositionFor(_options: {
  sourceMap: SourceMap;
  generatedLine: number;
  generatedColumn: number;
}) {
  const position: OriginalPosition | null = null;
  return position;
}
