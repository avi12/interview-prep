import { describe, expect, it } from "vitest";

import { reachedCueNames } from "@/narration/cue-timing.ts";

const CUES = [
  {
    name: "first",
    start: 0
  },
  {
    name: "second",
    start: 10
  }
];
const WORDS = [
  {
    offsetSeconds: 0.2,
    textStart: 0,
    textLength: 4
  },
  {
    offsetSeconds: 1.5,
    textStart: 10,
    textLength: 5
  }
];

describe("reachedCueNames", () => {
  it("reaches a cue when its first word is spoken", () => {
    expect(
      reachedCueNames({
        cues: CUES,
        words: WORDS,
        seconds: 0.5
      })
    ).toEqual(["first"]);
  });

  it("reaches every cue once the audio is past their words", () => {
    expect(
      reachedCueNames({
        cues: CUES,
        words: WORDS,
        seconds: 2
      })
    ).toEqual(["first", "second"]);
  });

  it("waits for words that have not arrived yet", () => {
    expect(
      reachedCueNames({
        cues: CUES,
        words: WORDS.slice(0, 1),
        seconds: 9
      })
    ).toEqual(["first"]);
  });

  it("reaches nothing before the first word", () => {
    expect(
      reachedCueNames({
        cues: CUES,
        words: WORDS,
        seconds: 0
      })
    ).toEqual([]);
  });
});
