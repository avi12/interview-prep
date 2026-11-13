import { describe, expect, it } from "vitest";

import { lessonIdFromUrl, urlForLesson } from "@/lib/lesson-address.ts";

const LESSON_ID = "foundations/01-two-sum";

describe("lesson address", () => {
  it("puts the lesson in the query so the link can be shared", () => {
    const url = urlForLesson({
      url: new URL("https://example.test/"),
      lessonId: LESSON_ID
    });
    expect(lessonIdFromUrl(url)).toBe(LESSON_ID);
  });

  it("replaces the previous lesson and keeps other parameters", () => {
    const url = urlForLesson({
      url: new URL("https://example.test/?lesson=sql/01&x=1"),
      lessonId: LESSON_ID
    });
    expect(url.searchParams.get("x")).toBe("1");
    expect(lessonIdFromUrl(url)).toBe(LESSON_ID);
  });

  it("finds nothing when the address has no lesson", () => {
    expect(lessonIdFromUrl(new URL("https://example.test/"))).toBeUndefined();
  });
});
