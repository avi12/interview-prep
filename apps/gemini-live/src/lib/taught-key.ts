import { z } from "./zod.ts";

const REPORT_BYTE_SEPARATOR = "-";
const RELEASE_BYTE_DISTANCE = 1;
const COMBO_SEPARATOR = " + ";

export const TeachRole = {
  KEY: "key",
  HELD_KEY: "heldKey"
} as const;
export type TeachRole = (typeof TeachRole)[keyof typeof TeachRole];

const hidCollectionShape = {
  device: z.string(),
  usagePage: z.number(),
  usage: z.number()
};

export const hidReportSchema = z.object({
  ...hidCollectionShape,
  report: z.string()
});

const taughtKeySchema = z.object({
  ...hidCollectionShape,
  label: z.string(),
  press: z.string(),
  release: z.string().nullable()
});

export const taughtMicKeyShape = {
  [TeachRole.KEY]: taughtKeySchema,
  [TeachRole.HELD_KEY]: taughtKeySchema.nullable()
};

const taughtMicKeySchema = z.object(taughtMicKeyShape);

export type HidReport = z.infer<typeof hidReportSchema>;
export type TaughtKey = z.infer<typeof taughtKeySchema>;
export type TaughtMicKey = z.infer<typeof taughtMicKeySchema>;

export const DEFAULT_KEY_LABEL: Record<TeachRole, string> = {
  [TeachRole.KEY]: "Mic key",
  [TeachRole.HELD_KEY]: "Held key"
};

type HidCollection = Omit<HidReport, "report">;

function isSameCollection(left: HidCollection, right: HidCollection) {
  return left.device === right.device && left.usagePage === right.usagePage && left.usage === right.usage;
}

function byteDistance({ left, right }: {
  left: string;
  right: string;
}) {
  const leftBytes = left.split(REPORT_BYTE_SEPARATOR);
  const rightBytes = right.split(REPORT_BYTE_SEPARATOR);
  if (leftBytes.length !== rightBytes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return leftBytes.filter((byte, index) => byte !== rightBytes[index]).length;
}

export function pressAndRelease(reports: HidReport[]) {
  const [press, ...rest] = reports;
  if (!press) {
    return null;
  }

  const release = rest.find(report => isSameCollection(report, press) && byteDistance({
    left: report.report,
    right: press.report
  }) === RELEASE_BYTE_DISTANCE);
  return {
    press,
    release: release ?? null
  };
}

export function taughtKeyOf({ reports, label }: {
  reports: HidReport[];
  label: string;
}): TaughtKey | null {
  const found = pressAndRelease(reports);
  if (!found) {
    return null;
  }

  const { press, release } = found;
  return {
    device: press.device,
    usagePage: press.usagePage,
    usage: press.usage,
    label,
    press: press.report,
    release: release?.report ?? null
  };
}

export function isSameKey(left: TaughtKey, right: TaughtKey) {
  return isSameCollection(left, right) && left.press === right.press;
}

function keysOf(taught: TaughtMicKey | null) {
  return taught ? [taught.heldKey, taught.key].filter(key => key !== null) : [];
}

export function watchedReports(taught: TaughtMicKey | null) {
  return keysOf(taught).flatMap(key => [key.press, key.release]
    .filter(report => report !== null)
    .map(report => ({
      device: key.device,
      usagePage: key.usagePage,
      usage: key.usage,
      report
    })));
}

export function keyEventOf({ taught, report }: {
  taught: TaughtMicKey | null;
  report: HidReport;
}) {
  if (!taught) {
    return undefined;
  }

  for (const role of Object.values(TeachRole)) {
    const key = taught[role];
    if (!key || !isSameCollection(key, report)) {
      continue;
    }

    if (key.press === report.report) {
      return {
        role,
        isDown: true
      };
    }

    if (key.release === report.report) {
      return {
        role,
        isDown: false
      };
    }
  }
  return undefined;
}

export function isTaughtKeyFired({ taught, isHeldKeyDown }: {
  taught: TaughtMicKey;
  isHeldKeyDown: boolean;
}) {
  return taught.heldKey === null || isHeldKeyDown;
}

export function taughtKeyText(taught: TaughtMicKey) {
  return keysOf(taught).map(key => key.label).join(COMBO_SEPARATOR);
}
