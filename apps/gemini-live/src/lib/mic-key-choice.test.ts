import { DEFAULT_KEY_COMBO } from "./key-combo.ts";
import {
  DEFAULT_MIC_KEY,
  micKeyText,
  withLabel,
  withoutHeldKey,
  withTaughtKey
} from "./mic-key-choice.ts";
import { taughtKeyOf, TeachRole } from "./taught-key.ts";
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
const m1Taught = withTaughtKey({
  micKey: DEFAULT_MIC_KEY,
  role: TeachRole.KEY,
  key: m1Key
});
const easyShiftM1 = withTaughtKey({
  micKey: m1Taught,
  role: TeachRole.HELD_KEY,
  key: easyShift
});

describe("the mic key", () => {
  it("starts as the default key combo", () => {
    expect(DEFAULT_MIC_KEY).toEqual({
      kind: "combo",
      combo: DEFAULT_KEY_COMBO
    });
    expect(micKeyText(DEFAULT_MIC_KEY)).toBe("Alt+Shift+M");
  });

  it("replaces the combo with a taught key, then adds a held key to it", () => {
    expect(micKeyText(m1Taught)).toBe("M1");
    expect(micKeyText(easyShiftM1)).toBe("Easy-Shift + M1");
  });

  it("ignores a held key while the mic key is still a combo", () => {
    expect(
      withTaughtKey({
        micKey: DEFAULT_MIC_KEY,
        role: TeachRole.HELD_KEY,
        key: easyShift
      })
    ).toBe(DEFAULT_MIC_KEY);
  });

  it("starts over with no held key when a new key is taught", () => {
    expect(
      withTaughtKey({
        micKey: easyShiftM1,
        role: TeachRole.KEY,
        key: m1Key
      })
    ).toEqual(m1Taught);
  });

  it("renames one key and drops the held key", () => {
    expect(
      micKeyText(
        withLabel({
          micKey: easyShiftM1,
          role: TeachRole.HELD_KEY,
          label: "Shift layer"
        })
      )
    ).toBe("Shift layer + M1");
    expect(withoutHeldKey(easyShiftM1)).toEqual(m1Taught);
  });
});
