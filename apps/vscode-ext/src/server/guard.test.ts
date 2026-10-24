import { isTrustedRequest } from "@/server/guard.ts";
import { describe, expect, it } from "vitest";

const HOST = "127.0.0.1:8766";
const ORIGIN = "http://127.0.0.1:8766";

describe("isTrustedRequest", () => {
  it("accepts the server's own host with no origin", () => {
    expect(isTrustedRequest({ host: HOST })).toBe(true);
  });

  it("accepts the server's own origin", () => {
    expect(
      isTrustedRequest({
        host: HOST,
        origin: ORIGIN
      })
    ).toBe(true);
  });

  it("rejects a rebound or missing host", () => {
    for (const host of ["evil.example:8766", "localhost:8766", "127.0.0.1", undefined]) {
      expect(isTrustedRequest({ host })).toBe(false);
    }
  });

  it("rejects another origin", () => {
    for (const origin of ["https://evil.example", "http://localhost:8766", "http://127.0.0.1:8765", "null"]) {
      expect(
        isTrustedRequest({
          host: HOST,
          origin
        })
      ).toBe(false);
    }
  });
});
