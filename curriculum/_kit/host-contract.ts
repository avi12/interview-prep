import type { RecordKindName } from "#scripts/lib/record-env.ts";

export const KIT_BRIDGE_KEY = "__interviewPrepKitBridge";

export type SuiteOutcome = {
  isPass: boolean;
  passedTitles: string[];
  failures: string[];
  crash: string;
};

export type SuiteRuns = {
  suiteDir: string;
  suiteFile: string;
  subjectFile: string;
  subjectSources: string[];
};

export type KitHost = {
  defaultImplDir: (lessonId: string) => string;
  importModule: (path: string) => Promise<object>;
  isFile: (path: string | URL) => boolean;
  readText: (path: string | URL) => string;
  appendRecord: (input: {
    kind: RecordKindName;
    record: unknown;
  }) => void;
  runSuitesWithSubjects: (runs: SuiteRuns) => Promise<SuiteOutcome[]>;
};
