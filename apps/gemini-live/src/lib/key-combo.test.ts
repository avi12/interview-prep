import {
  DEFAULT_KEY_COMBO,
  isComboEvent,
  isModifierOnly,
  keyComboOf,
  keyComboProblem,
  keyComboText
} from "./key-combo.ts";
import { describe, expect, it } from "vitest";

function keyEvent({ code, ctrlKey = false, altKey = false, shiftKey = false, metaKey = false }: {
  code: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}) {
  return {
    code,
    ctrlKey,
    altKey,
    shiftKey,
    metaKey
  };
}

describe("key combos", () => {
  it("matches the physical key and the exact modifiers, whatever the keyboard layout types", () => {
    expect(
      isComboEvent({
        combo: DEFAULT_KEY_COMBO,
        event: keyEvent({
          code: "KeyM",
          altKey: true,
          shiftKey: true
        })
      })
    ).toBe(true);
    expect(
      isComboEvent({
        combo: DEFAULT_KEY_COMBO,
        event: keyEvent({
          code: "KeyM",
          altKey: true,
          shiftKey: true,
          ctrlKey: true
        })
      })
    ).toBe(false);
  });

  it("records a combo from the keys pressed and names it", () => {
    expect(
      keyComboText(
        keyComboOf(
          keyEvent({
            code: "Digit1",
            ctrlKey: true,
            altKey: true
          })
        )
      )
    ).toBe("Ctrl+Alt+1");
  });

  it("waits past a lone modifier for the real key", () => {
    expect(isModifierOnly({ code: "ShiftLeft" })).toBe(true);
    expect(isModifierOnly({ code: "KeyM" })).toBe(false);
  });

  it("refuses a combo that would block typing, but lets a function key stand alone", () => {
    expect(
      keyComboProblem(
        keyComboOf(
          keyEvent({
            code: "KeyM",
            shiftKey: true
          })
        )
      )
    ).not.toBe("");
    expect(keyComboProblem(keyComboOf(keyEvent({ code: "F8" })))).toBe("");
  });
});
