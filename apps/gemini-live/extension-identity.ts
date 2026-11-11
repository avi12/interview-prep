import { createHash } from "node:crypto";

export const EXTENSION_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA+NAphq3OXaeOJ+PiqrxA9Mr/DcMN55l+ZzT2+8/xf/tMgnnZFvoL31kF6+O16Lw/QkgmuRGaYX" +
  "dTrG8Z1comQgXLb1KdPh+MRidWhxnwUZ7sY1zpqQd+gpGQp2GvwW/Ld9zsLKXq/s8iWC01M7nLaarpywdHIjnh1GuJi00co7VAY/ijIvznUuVgtsFNBmq1" +
  "QC7VkZ+Rr+8CFr7Of1BDMkRhk0HVRumP3MAWwEMBWNY0UEhP2tR/2Wk5//d2RhjmxELBHsBDZjd34GLphYTgzM0KNQ4vjp/JSrlTmYDSCAKR1qMnuRGCFg" +
  "UYU7njbU3UutiRDd//01fvkkCvSp48nQIDAQAB";

const ID_LENGTH = 32;
const ID_ALPHABET_START = "a".charCodeAt(0);
const HEX_RADIX = 16;

export function extensionId() {
  const digest = createHash("sha256").update(Buffer.from(EXTENSION_KEY, "base64")).digest("hex");
  return Array.from(
    digest.slice(0, ID_LENGTH),
    digit => String.fromCharCode(ID_ALPHABET_START + Number.parseInt(digit, HEX_RADIX))
  ).join("");
}
