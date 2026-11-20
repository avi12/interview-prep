import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = {
  classifyPing: (output: string) => string;
  analyzeTrace: (output: string) => {
    hopCount: number;
    isReached: boolean;
    lastReplyAddress: string;
    firstSlowHop: number | null;
  };
};

const { classifyPing, analyzeTrace } = await loadImpl<Module>({ testUrl: import.meta.url, file: "trace.ts" });

const PING_OK = `
Pinging 192.118.82.148 with 32 bytes of data:
Reply from 192.118.82.148: bytes=32 time=14ms TTL=246
Reply from 192.118.82.148: bytes=32 time=11ms TTL=246

Ping statistics for 192.118.82.148:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
`;

const PING_SOME_LOST = `
Pinging 10.0.0.9 with 32 bytes of data:
Reply from 10.0.0.9: bytes=32 time=3ms TTL=64
Request timed out.
Reply from 10.0.0.9: bytes=32 time=4ms TTL=64
Request timed out.

Ping statistics for 10.0.0.9:
    Packets: Sent = 4, Received = 2, Lost = 2 (50% loss),
`;

const PING_SILENT = `
Pinging 1.2.3.4 with 32 bytes of data:
Request timed out.
Request timed out.
Request timed out.
Request timed out.

Ping statistics for 1.2.3.4:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),
`;

const PING_UNREACHABLE = `
Pinging 192.168.99.1 with 32 bytes of data:
Reply from 192.168.1.105: Destination host unreachable.
Reply from 192.168.1.105: Destination host unreachable.

Ping statistics for 192.168.99.1:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
`;

const PING_TTL = `
Pinging 8.8.8.8 with 32 bytes of data:
Reply from 10.12.64.1: TTL expired in transit.
Reply from 10.12.64.1: TTL expired in transit.

Ping statistics for 8.8.8.8:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
`;

const PING_NO_NAME = "Ping request could not find host nope.invalid. Please check the name and try again.";

const TRACE_SLOW_LINK = `
Tracing route to www.example.com [104.106.97.109]
over a maximum of 30 hops:

  1     2 ms     1 ms     1 ms  192.168.1.1
  2     *        *        *     Request timed out.
  3   124 ms   100 ms   100 ms  82.102.132.78
  4   119 ms   102 ms   100 ms  80.179.166.38
  5   120 ms   100 ms   101 ms  104.106.97.109

Trace complete.
`;

const TRACE_DIES = `
Tracing route to 10.50.0.9 over a maximum of 30 hops:

  1    <1 ms    <1 ms    <1 ms  10.13.2.254
  2     4 ms     5 ms     3 ms  172.16.0.1
  3     *        *        *     Request timed out.
  4     *        *        *     Request timed out.
`;

describe("classifyPing", () => {
  it("is ok when every request is answered", () => {
    expect(classifyPing(PING_OK)).toBe("ok");
  });

  it("reports partial loss when some requests time out", () => {
    expect(classifyPing(PING_SOME_LOST)).toBe("partial-loss");
  });

  it("reports timed out when nothing is answered", () => {
    expect(classifyPing(PING_SILENT)).toBe("timed-out");
  });

  it("reports unreachable even though the statistics claim nothing was lost", () => {
    expect(classifyPing(PING_UNREACHABLE)).toBe("unreachable");
  });

  it("reports an expired TTL", () => {
    expect(classifyPing(PING_TTL)).toBe("ttl-expired");
  });

  it("reports an unknown host before looking at anything else", () => {
    expect(classifyPing(PING_NO_NAME)).toBe("unknown-host");
  });
});

describe("analyzeTrace", () => {
  it("finds the first slow hop and ignores the silent one before it", () => {
    expect(analyzeTrace(TRACE_SLOW_LINK)).toEqual({
      hopCount: 5,
      isReached: true,
      lastReplyAddress: "104.106.97.109",
      firstSlowHop: 3,
    });
  });

  it("reports a trace that dies: not reached, last answering router, no slow hop", () => {
    expect(analyzeTrace(TRACE_DIES)).toEqual({
      hopCount: 4,
      isReached: false,
      lastReplyAddress: "172.16.0.1",
      firstSlowHop: null,
    });
  });

  it("does not count header lines as hops", () => {
    expect(analyzeTrace("Tracing route to x\nover a maximum of 30 hops:\n").hopCount).toBe(0);
  });
});
