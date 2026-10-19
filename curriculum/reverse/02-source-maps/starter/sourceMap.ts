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

export function decodeMappings(mappings: string) {
  return [] as Segment[][];
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
  return null as { source: string; line: number; column: number; name: string | null } | null;
}
