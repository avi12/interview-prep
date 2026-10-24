import { appendCaption, type Caption, closeCaptions, Speaker } from "./captions.ts";
import { describe, expect, it } from "vitest";

function say({ captions, speaker, parts }: {
  captions: Caption[];
  speaker: Speaker;
  parts: string[];
}) {
  let result = captions;
  for (const text of parts) {
    result = appendCaption({
      captions: result,
      speaker,
      text
    });
  }
  return result;
}

describe("appendCaption", () => {
  it("joins the fragments of one speaker into one line", () => {
    const captions = say({
      captions: [],
      speaker: Speaker.TUTOR,
      parts: [" Hello", " there"]
    });
    expect(captions).toEqual([{
      speaker: Speaker.TUTOR,
      text: "Hello there",
      isOpen: true
    }]);
  });

  it("starts a new line when the other one speaks", () => {
    const tutor = say({
      captions: [],
      speaker: Speaker.TUTOR,
      parts: ["Hi"]
    });
    const both = say({
      captions: tutor,
      speaker: Speaker.LEARNER,
      parts: ["Hey"]
    });
    expect(both.map(caption => caption.text)).toEqual(["Hi", "Hey"]);
    expect(both[0]?.isOpen).toBe(false);
  });

  it("starts a new line after the turn ends, and keeps only the latest lines", () => {
    let captions: Caption[] = [];
    for (let i = 0; i < 20; i++) {
      captions = closeCaptions(
        appendCaption({
          captions,
          speaker: Speaker.TUTOR,
          text: `line ${i}`
        })
      );
    }
    expect(captions).toHaveLength(8);
    expect(captions.at(-1)?.text).toBe("line 19");
  });
});
