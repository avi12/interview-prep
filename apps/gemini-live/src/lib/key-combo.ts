import { z } from "./zod.ts";

const COMBO_SEPARATOR = "+";
const FUNCTION_KEY_CODE = /^F\d{1,2}$/;
const CODE_PREFIX = /^(Key|Digit)/;
const MODIFIER_CODES = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight"
]);
const NEEDS_MODIFIER_TEXT = "Add Ctrl or Alt, so typing that key in VS Code still works";

export const keyComboSchema = z.object({
  code: z.string(),
  isCtrl: z.boolean(),
  isAlt: z.boolean(),
  isShift: z.boolean(),
  isMeta: z.boolean()
});

export type KeyCombo = z.infer<typeof keyComboSchema>;

export const DEFAULT_KEY_COMBO: KeyCombo = {
  code: "KeyM",
  isCtrl: false,
  isAlt: true,
  isShift: true,
  isMeta: false
};

type KeyEventLike = Pick<KeyboardEvent, "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

export function isModifierOnly(event: Pick<KeyboardEvent, "code">) {
  return MODIFIER_CODES.has(event.code);
}

export function keyComboOf(event: KeyEventLike): KeyCombo {
  return {
    code: event.code,
    isCtrl: event.ctrlKey,
    isAlt: event.altKey,
    isShift: event.shiftKey,
    isMeta: event.metaKey
  };
}

export function isComboEvent({ combo, event }: {
  combo: KeyCombo;
  event: KeyEventLike;
}) {
  const pressed = keyComboOf(event);
  return pressed.code === combo.code &&
    pressed.isCtrl === combo.isCtrl &&
    pressed.isAlt === combo.isAlt &&
    pressed.isShift === combo.isShift &&
    pressed.isMeta === combo.isMeta;
}

export function keyComboProblem(combo: KeyCombo) {
  const hasCommandModifier = combo.isCtrl || combo.isAlt || combo.isMeta;
  return hasCommandModifier || FUNCTION_KEY_CODE.test(combo.code) ? "" : NEEDS_MODIFIER_TEXT;
}

export function keyComboText(combo: KeyCombo) {
  return [
    combo.isCtrl && "Ctrl",
    combo.isAlt && "Alt",
    combo.isShift && "Shift",
    combo.isMeta && "Meta",
    combo.code.replace(CODE_PREFIX, "")
  ].filter(Boolean).join(COMBO_SEPARATOR);
}
