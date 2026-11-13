import { describe, expect, it } from "vitest";

import { parseNarrationScript } from "#scripts/lib/edge-tts/script.ts";

describe("parseNarrationScript", () => {
  it("strips cue markers and records where each cue starts", () => {
    const { text, cues } = parseNarrationScript(
      "The popup sends a request [[wire]] across the wire, then [[audio]]audio streams back"
    );
    expect(text).toBe("The popup sends a request across the wire, then audio streams back");
    expect(cues).toEqual([
      {
        name: "wire",
        start: text.indexOf("across")
      },
      {
        name: "audio",
        start: text.indexOf("audio")
      }
    ]);
  });

  it("collapses whitespace from multi-line attributes", () => {
    expect(parseNarrationScript("  [[a]] First line\n      second   line  ").text).toBe("First line second line");
  });

  it("leaves scripts without markers alone", () => {
    expect(parseNarrationScript("Just words")).toEqual({
      text: "Just words",
      cues: []
    });
  });
});
