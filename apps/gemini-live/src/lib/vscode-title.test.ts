import { EditorKind, parseVscodeTitle } from "./vscode-title.ts";
import { describe, expect, it } from "vitest";

describe("parseVscodeTitle", () => {
  it("reads the open file", () => {
    expect(parseVscodeTitle("two_sum.py - interview-prep - Visual Studio Code")).toEqual({
      kind: EditorKind.FILE,
      name: "two_sum.py"
    });
  });

  it("drops the unsaved marker", () => {
    expect(parseVscodeTitle("● two_sum.py - interview-prep - Visual Studio Code")).toEqual({
      kind: EditorKind.FILE,
      name: "two_sum.py"
    });
  });

  it("reads a lesson page by its title", () => {
    expect(parseVscodeTitle("Valid Parentheses - interview-prep - Visual Studio Code")).toEqual({
      kind: EditorKind.LESSON,
      name: "Valid Parentheses"
    });
  });

  it("keeps a lesson title that has a dash of its own", () => {
    expect(parseVscodeTitle("Cache - the LRU idea - interview-prep - Visual Studio Code")).toEqual({
      kind: EditorKind.LESSON,
      name: "Cache - the LRU idea"
    });
  });

  it("does not take a title with dots and spaces for a file", () => {
    expect(parseVscodeTitle("Intro to Node.js - interview-prep - Visual Studio Code")?.kind).toBe(EditorKind.LESSON);
  });

  it("says nothing when only the folder is open", () => {
    expect(parseVscodeTitle("interview-prep - Visual Studio Code")).toBeNull();
  });

  it("says nothing for an empty or unrelated title", () => {
    expect(parseVscodeTitle("")).toBeNull();
    expect(parseVscodeTitle("Visual Studio Code")).toBeNull();
  });
});
