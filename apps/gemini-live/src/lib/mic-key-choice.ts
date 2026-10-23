import { DEFAULT_KEY_COMBO, type KeyCombo, keyComboSchema, keyComboText } from "./key-combo.ts";
import {
  type TaughtKey,
  taughtKeyText,
  type TaughtMicKey,
  taughtMicKeyShape,
  TeachRole
} from "./taught-key.ts";
import { z } from "./zod.ts";

export const MicKeyKind = {
  COMBO: "combo",
  TAUGHT: "taught"
} as const;

export const micKeySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(MicKeyKind.COMBO),
    combo: keyComboSchema
  }),
  z.object({
    kind: z.literal(MicKeyKind.TAUGHT),
    ...taughtMicKeyShape
  })
]);

export type MicKey = z.infer<typeof micKeySchema>;

export function comboMicKey(combo: KeyCombo): MicKey {
  return {
    kind: MicKeyKind.COMBO,
    combo
  };
}

export const DEFAULT_MIC_KEY = comboMicKey(DEFAULT_KEY_COMBO);

export function taughtOf(micKey: MicKey) {
  return micKey.kind === MicKeyKind.TAUGHT ? micKey : null;
}

export function micKeyText(micKey: MicKey) {
  return micKey.kind === MicKeyKind.COMBO ? keyComboText(micKey.combo) : taughtKeyText(micKey);
}

function taughtMicKey(taught: TaughtMicKey): MicKey {
  return {
    kind: MicKeyKind.TAUGHT,
    ...taught
  };
}

export function withTaughtKey({ micKey, role, key }: {
  micKey: MicKey;
  role: TeachRole;
  key: TaughtKey;
}) {
  if (role === TeachRole.KEY) {
    return taughtMicKey({
      key,
      heldKey: null
    });
  }

  const taught = taughtOf(micKey);
  return taught ? taughtMicKey({
    ...taught,
    heldKey: key
  }) : micKey;
}

export function withLabel({ micKey, role, label }: {
  micKey: MicKey;
  role: TeachRole;
  label: string;
}) {
  const taught = taughtOf(micKey);
  const key = taught?.[role];
  if (!taught || !key) {
    return micKey;
  }

  return taughtMicKey({
    ...taught,
    [role]: {
      ...key,
      label
    }
  });
}

export function withoutHeldKey(micKey: MicKey) {
  const taught = taughtOf(micKey);
  return taught ? taughtMicKey({
    ...taught,
    heldKey: null
  }) : micKey;
}
