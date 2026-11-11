export const RecordKind = {
  queryResults: "queryResults",
  testCases: "testCases"
} as const;

export type RecordKindName = typeof RecordKind[keyof typeof RecordKind];

export const RECORD_ENV = {
  [RecordKind.queryResults]: "QUERY_RESULT_FILE",
  [RecordKind.testCases]: "TEST_CASES_FILE"
} as const satisfies Record<RecordKindName, string>;

export const IMPL_DIR_ENV = "IMPL_DIR";
