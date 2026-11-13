import { describe, expect, it } from "vitest";
import * as vscode from "vscode";

import { lessonIdOfUri, workFileUris } from "@/workspaceLayout.ts";

const ROOT = vscode.Uri.file("/c:/repositories/interview-prep");

describe("lessonIdOfUri", () => {
  it("finds the lesson of a file inside its work folder", () => {
    const uri = vscode.Uri.joinPath(ROOT, "work", "sql/02-joins", "query.sql");
    expect(
      lessonIdOfUri({
        root: ROOT,
        uri
      })
    ).toBe("sql/02-joins");
  });

  it("finds the lesson of a nested work file", () => {
    const uri = vscode.Uri.joinPath(ROOT, "work", "oop/06-observer", "helpers", "events.ts");
    expect(
      lessonIdOfUri({
        root: ROOT,
        uri
      })
    ).toBe("oop/06-observer");
  });

  it("ignores files outside the work folder, and the lesson folder itself", () => {
    const outside = vscode.Uri.joinPath(ROOT, "curriculum", "sql", "02-joins", "lesson.md");
    const folder = vscode.Uri.joinPath(ROOT, "work", "sql", "02-joins");
    const lookalike = vscode.Uri.joinPath(ROOT, "workbench", "sql", "02-joins", "query.sql");
    for (const uri of [outside, folder, lookalike]) {
      expect(
        lessonIdOfUri({
          root: ROOT,
          uri
        })
      ).toBeUndefined();
    }
  });

  it("matches the drive and folders whatever their case", () => {
    const uri = vscode.Uri.file("/C:/Repositories/interview-prep/work/sql/02-joins/query.sql");
    expect(
      lessonIdOfUri({
        root: ROOT,
        uri
      })
    ).toBe("sql/02-joins");
  });
});

describe("workFileUris", () => {
  it("places each exercise file in the lesson's work folder", () => {
    const uris = workFileUris({
      root: ROOT,
      lessonId: "oop/06-observer",
      files: ["observer.ts", "helpers/events.ts"]
    });
    expect(uris.map(uri => uri.path)).toEqual([
      "/c:/repositories/interview-prep/work/oop/06-observer/observer.ts",
      "/c:/repositories/interview-prep/work/oop/06-observer/helpers/events.ts"
    ]);
  });
});
