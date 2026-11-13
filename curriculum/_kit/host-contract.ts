import type { RecordKindName } from "#scripts/lib/record-env.ts";

export const KIT_BRIDGE_KEY = "__interviewPrepKitBridge";

export interface SuiteOutcome {
  isPass: boolean;
  passedTitles: string[];
  failures: string[];
  crash: string;
}

export interface SuiteRuns {
  suiteDir: string;
  suiteFile: string;
  subjectFile: string;
  subjectSources: string[];
}

interface RecordInput {
  kind: RecordKindName;
  record: unknown;
}

export interface KitHost {
  defaultImplDir: (lessonId: string) => string;
  importModule: (path: string) => Promise<object>;
  isFile: (path: string | URL) => boolean;
  readText: (path: string | URL) => string;
  appendRecord: (input: RecordInput) => void;
  runSuitesWithSubjects: (runs: SuiteRuns) => Promise<SuiteOutcome[]>;
}
