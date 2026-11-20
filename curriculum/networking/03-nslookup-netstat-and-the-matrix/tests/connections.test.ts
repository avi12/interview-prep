import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Connection = { protocol: string; localPort: number; foreignAddress: string; state: string };
type Module = {
  parseConnections: (netstatOutput: string) => Connection[];
  firstCommand: (symptom: string) => string;
};

const { parseConnections, firstCommand } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "connections.ts",
});

const BUSY_PC = `
Active Connections

  Proto  Local Address          Foreign Address        State
  TCP    192.168.1.105:56789    198.133.219.25:443     ESTABLISHED
  TCP    192.168.1.105:56790    198.133.219.25:80      TIME_WAIT
  TCP    0.0.0.0:3389           0.0.0.0:0              LISTENING
  UDP    192.168.1.105:137      *:*
`;

const IPV6_BOX = `
  TCP    [::1]:8080             [::]:0                 LISTENING
  UDP    [fe80::1%3]:5353       *:*
`;

describe("parseConnections", () => {
  it("returns one record per TCP or UDP row and skips the headers", () => {
    expect(parseConnections(BUSY_PC)).toEqual([
      { protocol: "TCP", localPort: 56789, foreignAddress: "198.133.219.25:443", state: "ESTABLISHED" },
      { protocol: "TCP", localPort: 56790, foreignAddress: "198.133.219.25:80", state: "TIME_WAIT" },
      { protocol: "TCP", localPort: 3389, foreignAddress: "0.0.0.0:0", state: "LISTENING" },
      { protocol: "UDP", localPort: 137, foreignAddress: "*:*", state: "" },
    ]);
  });

  it("reads the port after the last colon of an IPv6 address", () => {
    expect(parseConnections(IPV6_BOX)).toEqual([
      { protocol: "TCP", localPort: 8080, foreignAddress: "[::]:0", state: "LISTENING" },
      { protocol: "UDP", localPort: 5353, foreignAddress: "*:*", state: "" },
    ]);
  });

  it("returns an empty list when there are no connection rows", () => {
    expect(parseConnections("Active Connections\n")).toEqual([]);
  });
});

describe("firstCommand", () => {
  it.each([
    ["limited-connection", "ipconfig /renew"],
    ["sites-will-not-load", "nslookup"],
    ["slow-with-loss", "tracert"],
    ["secret-traffic", "netstat -b"],
    ["no-remote-networks", "netstat -r"],
  ])("maps %s to %s", (symptom, command) => {
    expect(firstCommand(symptom)).toBe(command);
  });
});
