import {
  isTaughtKeyFired,
  keyEventOf,
  taughtKeyOf,
  taughtKeyText,
  type TaughtMicKey,
  TeachRole,
  watchedReports
} from "./taught-key.ts";
import { describe, expect, it } from "vitest";

const KEYBOARD = {
  device: "vid_1e7d&pid_303e",
  usagePage: 10,
  usage: 0
};

function reportsOf(reports: string[]) {
  return reports.map(report => ({
    ...KEYBOARD,
    report
  }));
}

function taught(learned: Parameters<typeof taughtKeyOf>[0]) {
  const key = taughtKeyOf(learned);
  if (!key) {
    throw new Error(`Could not learn ${learned.label}`);
  }

  return key;
}

const m1Key = taught({
  reports: reportsOf(["03-00-19-7D-00", "03-0A-FA-01-00", "03-00-19-7D-01"]),
  label: "M1"
});
const easyShift = taught({
  reports: reportsOf(["03-00-19-8D-00", "03-00-FD-01-00", "03-0E-FA-01-00", "03-08-FA-01-00", "03-00-19-8D-01", "03-00-FD-00-00"]),
  label: "Easy-Shift"
});
const m1Alone: TaughtMicKey = {
  key: m1Key,
  heldKey: null
};
const easyShiftM1: TaughtMicKey = {
  key: m1Key,
  heldKey: easyShift
};

describe("taughtKeyOf", () => {
  it("takes the first report as the press and the one-byte change after it as the release", () => {
    expect(m1Key).toMatchObject({
      press: "03-00-19-7D-00",
      release: "03-00-19-7D-01"
    });
  });

  it("skips the side events a modifier sends while it is held", () => {
    expect(easyShift).toMatchObject({
      press: "03-00-19-8D-00",
      release: "03-00-19-8D-01"
    });
  });

  it("learns a press with no release when the key never reports one", () => {
    expect(
      taughtKeyOf({
        reports: reportsOf(["01-04-00"]),
        label: "Tap"
      })?.release
    ).toBeNull();
  });

  it("learns nothing when no key was pressed", () => {
    expect(
      taughtKeyOf({
        reports: [],
        label: "None"
      })
    ).toBeNull();
  });
});

describe("keyEventOf", () => {
  function eventOf(report: string) {
    return keyEventOf({
      taught: easyShiftM1,
      report: {
        ...KEYBOARD,
        report
      }
    });
  }

  it("tells the mic key from the held key, and presses from releases", () => {
    expect(eventOf("03-00-19-7D-00")).toEqual({
      role: TeachRole.KEY,
      isDown: true
    });
    expect(eventOf("03-00-19-8D-01")).toEqual({
      role: TeachRole.HELD_KEY,
      isDown: false
    });
    expect(eventOf("03-0A-FA-01-00")).toBeUndefined();
  });
});

describe("isTaughtKeyFired", () => {
  it("fires a key with nothing to hold whenever it is pressed", () => {
    expect(
      isTaughtKeyFired({
        taught: m1Alone,
        isHeldKeyDown: false
      })
    ).toBe(true);
  });

  it("fires a combo only while its held key is down", () => {
    expect(
      isTaughtKeyFired({
        taught: easyShiftM1,
        isHeldKeyDown: true
      })
    ).toBe(true);
    expect(
      isTaughtKeyFired({
        taught: easyShiftM1,
        isHeldKeyDown: false
      })
    ).toBe(false);
  });
});

describe("a taught combo", () => {
  it("names the held key first", () => {
    expect(taughtKeyText(easyShiftM1)).toBe("Easy-Shift + M1");
  });

  it("asks the helper to watch the press and release of both keys", () => {
    expect(watchedReports(easyShiftM1).map(({ report }) => report)).toEqual([
      "03-00-19-8D-00",
      "03-00-19-8D-01",
      "03-00-19-7D-00",
      "03-00-19-7D-01"
    ]);
  });
});
