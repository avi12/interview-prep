export const RecordKind = {
  QUERY_RESULTS: "queryResults",
  TEST_CASES: "testCases"
} as const;

export type RecordKindName = (typeof RecordKind)[keyof typeof RecordKind];

export const RECORD_ENV = {
  [RecordKind.QUERY_RESULTS]: "QUERY_RESULT_FILE",
  [RecordKind.TEST_CASES]: "TEST_CASES_FILE"
} as const satisfies Record<RecordKindName, string>;

export const IMPL_DIR_ENV = "IMPL_DIR";
