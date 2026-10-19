import { defineMutationCheck } from "#kit/mutation.ts";
import { PAGINATE_MUTANTS } from "./fixtures/paginateMutants.ts";

const MIN_TESTS = 8;
const MIN_TITLE_WORDS = 3;

defineMutationCheck({
  testUrl: import.meta.url,
  suiteFile: "paginate.test.ts",
  subjectFile: "paginate.ts",
  mutants: PAGINATE_MUTANTS,
  minTests: MIN_TESTS,
  minTitleWords: MIN_TITLE_WORDS
});
