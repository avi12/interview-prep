import { SLUGIFY_MUTANTS } from "./fixtures/slugifyMutants.ts";
import { defineMutationCheck } from "#kit/mutation.ts";

const MIN_TESTS = 6;
const MIN_TITLE_WORDS = 3;

defineMutationCheck({
  testUrl: import.meta.url,
  suiteFile: "slugify.test.ts",
  subjectFile: "slugify.ts",
  mutants: SLUGIFY_MUTANTS,
  minTests: MIN_TESTS,
  minTitleWords: MIN_TITLE_WORDS
});
