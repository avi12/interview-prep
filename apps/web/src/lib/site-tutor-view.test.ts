import { buildSiteTutorView, siteViewSourcesSchema } from "@/lib/site-tutor-view.ts";
import { TutorBlockKind, tutorViewSchema } from "#scripts/lib/tutor-view.ts";
import { describe, expect, it } from "vitest";

const NOTES = [{
  kind: TutorBlockKind.HEADING,
  text: "Card"
}];

describe("buildSiteTutorView", () => {
  it("builds a view that satisfies the shared schema", () => {
    const view = buildSiteTutorView({
      lessonTitle: "Two sum",
      notes: NOTES,
      file: {
        name: "twoSum.ts",
        code: "export const x = 1;"
      },
      lastTest: null
    });
    expect(tutorViewSchema.safeParse(view).success).toBe(true);
    expect(view.title).toBe("Two sum");
    expect(view.blocks).toContainEqual({
      kind: TutorBlockKind.PARAGRAPH,
      text: "export const x = 1;"
    });
  });

  it("changes the version when the code changes", () => {
    const base = {
      lessonTitle: "Two sum",
      notes: NOTES,
      lastTest: null
    };
    const first = buildSiteTutorView({
      ...base,
      file: {
        name: "a.ts",
        code: "one"
      }
    });
    const second = buildSiteTutorView({
      ...base,
      file: {
        name: "a.ts",
        code: "two"
      }
    });
    expect(first.version).not.toBe(second.version);
  });

  it("copes with no lesson and no file", () => {
    const view = buildSiteTutorView({
      lessonTitle: null,
      notes: [],
      file: null,
      lastTest: null
    });
    expect(view.title).toBe("No lesson open");
  });

  it("rejects malformed sources", () => {
    const malformed = siteViewSourcesSchema.safeParse({
      lessonTitle: "x",
      notes: [{
        kind: "bogus",
        text: "y"
      }],
      file: null,
      lastTest: null
    });
    expect(malformed.success).toBe(false);
  });
});
