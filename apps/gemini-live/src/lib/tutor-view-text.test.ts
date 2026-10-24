import { tutorViewContext, tutorViewText } from "./tutor-view-text.ts";
import { EditorKind } from "./vscode-title.ts";
import { tutorHeading, tutorParagraph, type TutorView } from "@scripts/lib/tutor-view.ts";
import { describe, expect, it } from "vitest";

function view(title: string): TutorView {
  return {
    version: "1",
    title,
    blocks: [tutorHeading("Tests"), tutorParagraph("2 passed")],
    testRun: null
  };
}

describe("tutorViewText", () => {
  it("marks headings and keeps paragraphs as they are, in order", () => {
    const text = tutorViewText(view("Two Sum"));
    expect(text).toContain("# Two Sum\n\n## Tests\n\n2 passed");
  });

  it("tells the tutor not to answer it", () => {
    expect(tutorViewText(view("Two Sum"))).toContain("Do not reply to this message");
  });
});

describe("tutorViewContext", () => {
  it("names the lesson from the view title", () => {
    expect(tutorViewContext(view("Two Sum"))).toEqual({
      kind: EditorKind.LESSON,
      name: "Two Sum"
    });
  });

  it("says nothing when no lesson is open or there is no view", () => {
    expect(tutorViewContext(view("VS Code"))).toBeNull();
    expect(tutorViewContext(null)).toBeNull();
  });
});
