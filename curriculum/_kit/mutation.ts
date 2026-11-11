import type { SuiteOutcome } from "#kit/host-contract.ts";
import { kitHost } from "#kit/host.ts";
import { implDir, implPath, lessonFileUrl, lessonIdOf } from "#kit/impl.ts";
import { STARTER_DIR_NAME } from "#scripts/lib/layout.ts";
import { beforeAll, describe, expect, it } from "vitest";

const SETUP_TIMEOUT_MS = 240_000;
const WORD_SEPARATOR = /\s+/;

export type Edit = {
  find: string;
  replace: string;
};
export type Mutant = {
  name: string;
  edits: Edit[];
};

function withUnixLineEndings(text: string) {
  return text.replaceAll("\r\n", "\n");
}

function applyEdit({ source, edit, mutantName }: {
  source: string;
  edit: Edit;
  mutantName: string;
}) {
  const parts = source.split(edit.find);
  const occurrences = parts.length - 1;
  if (occurrences !== 1) {
    throw new Error(`Mutant "${mutantName}": the text to change must appear exactly once in the reference, found ${occurrences}: ${edit.find}`);
  }

  return parts.join(edit.replace);
}

export function applyMutant({ source, mutant }: {
  source: string;
  mutant: Mutant;
}) {
  let mutated = withUnixLineEndings(source);
  for (const edit of mutant.edits) {
    mutated = applyEdit({
      source: mutated,
      edit,
      mutantName: mutant.name
    });
  }
  return mutated;
}

function describeProblems(outcome: SuiteOutcome) {
  return [...outcome.failures, outcome.crash].filter(Boolean).join("\n");
}

export function defineMutationCheck({
  testUrl,
  suiteFile,
  subjectFile,
  mutants,
  minTests,
  minTitleWords = 1
}: {
  testUrl: string;
  suiteFile: string;
  subjectFile: string;
  mutants: Mutant[];
  minTests: number;
  minTitleWords?: number;
}) {
  const referenceSource = withUnixLineEndings(
    kitHost.readText(
      lessonFileUrl({
        testUrl,
        file: `${STARTER_DIR_NAME}/${subjectFile}`
      })
    )
  );
  const suitePath = implPath({
    testUrl,
    file: suiteFile
  });
  const subjectSources = [referenceSource, ...mutants.map(mutant => applyMutant({
    source: referenceSource,
    mutant
  }))];
  let outcomes: SuiteOutcome[] = [];

  describe(`your tests in ${suiteFile}`, () => {
    beforeAll(async () => {
      if (!kitHost.isFile(suitePath)) {
        throw new Error(`Missing ${suiteFile}. Run: pnpm lesson open ${lessonIdOf(testUrl)}`);
      }

      outcomes = await kitHost.runSuitesWithSubjects({
        suiteDir: implDir(testUrl),
        suiteFile,
        subjectFile,
        subjectSources
      });
    }, SETUP_TIMEOUT_MS);

    it("pass on the correct code", () => {
      if (!outcomes[0].isPass) {
        expect.fail(`your tests fail on the correct code:\n${describeProblems(outcomes[0]) || "no passing test was found"}`);
      }
    });

    it(`include at least ${minTests} separate tests`, () => {
      expect(outcomes[0].passedTitles.length).toBeGreaterThanOrEqual(minTests);
    });

    it(`give every test a name of at least ${minTitleWords} words, all different`, () => {
      const titles = outcomes[0].passedTitles;
      const shortTitles = titles.filter(title => title.trim().split(WORD_SEPARATOR).length < minTitleWords);
      expect(shortTitles, "these names are too short to explain a failure").toEqual([]);
      expect(new Set(titles).size, "two tests share a name").toBe(titles.length);
    });

    it.each(
      mutants.map((mutant, index) => ({
        number: index + 1,
        outcomeIndex: index + 1,
        name: mutant.name
      }))
    )(
      `catch seeded bug $number of ${mutants.length}`,
      ({ outcomeIndex, name }) => {
        if (!outcomes[0].isPass) {
          expect.fail("fix the tests that fail on the correct code first");
        }

        if (outcomes[outcomeIndex].isPass) {
          expect.fail(`your tests still pass when the code has this bug: ${name}`);
        }
      }
    );
  });
}
