import { createHash } from "node:crypto";

export const EXTENSION_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmGr9HuEbFdJtT3M9DeKCkdF7h+gCqd6xR/eMIm3Who9vbZPAal/gkvjBk4k5nAacRUtLhYRA" +
  "+g4XBO0Cb/qd8DvXSGilGsoIG0NmCP3N/7Gg5rgzwJ+ZBVWrEwppG7XlZ0mIeU4WuJdfZLBNEMotNWCMlOo7kN/1CMTt1JsquAnEJlIA8OqE5ZunVAM3JEMc/" +
  "Ng66unuKTLUWAT1Wea3msCRhGjCAwWJL1gFK5a2zoN4Gt1CjgPYap4JgRtZi/vyehPCSe9Bc2JF8Wgh1HmrIfTVv+EP1MUf16KYtv4iSCOMASfQS3BNW4SmB" +
  "/NjCd3jjakiLdro0+KnrR7YFV/g4QIDAQAB";

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
