import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Adapter = { hostName: string; ipv4: string; mac: string; gateway: string; isDhcpEnabled: boolean };
type Pings = { gateway: boolean; publicAddress: boolean; publicName: boolean };
type Module = {
  readAdapter: (ipconfigOutput: string) => Adapter;
  diagnose: (input: { adapter: Adapter; pings: Pings }) => string;
};

const { readAdapter, diagnose } = await loadImpl<Module>({ testUrl: import.meta.url, file: "network.ts" });

const OFFICE_DESK = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : DESK-07
   Primary Dns Suffix  . . . . . . . :
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No

Wireless LAN adapter Wi-Fi:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Intel(R) Wi-Fi 6 AX201 160MHz
   Physical Address. . . . . . . . . : 9C-B6-D0-11-22-33
   DHCP Enabled. . . . . . . . . . . : Yes

Ethernet adapter Ethernet:

   Connection-specific DNS Suffix  . : office.local
   Description . . . . . . . . . . . : Intel(R) Ethernet Connection I219-LM
   Physical Address. . . . . . . . . : 00-1A-2B-3C-4D-5E
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 10.13.2.17(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Lease Obtained. . . . . . . . . . : Monday, November 9, 2026 08:01:12
   Default Gateway . . . . . . . . . : 10.13.2.254
   DHCP Server . . . . . . . . . . . : 10.13.2.1
   DNS Servers . . . . . . . . . . . : 10.13.2.1
`;

const LAB_SERVER = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : LAB-SRV-2
   Primary Dns Suffix  . . . . . . . : lab.example

Ethernet adapter Uplink:

   Description . . . . . . . . . . . : Realtek PCIe GbE Family Controller
   Physical Address. . . . . . . . . : A4-BB-6D-70-81-92
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 192.168.50.10(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.50.1
`;

const NO_LEASE_LAPTOP = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : LAPTOP-3F

Ethernet adapter Ethernet:

   Description . . . . . . . . . . . : Intel(R) Ethernet Connection
   Physical Address. . . . . . . . . : 3C-52-82-AA-BB-CC
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   Autoconfiguration IPv4 Address. . : 169.254.88.14(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . :
`;

const UNPLUGGED = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : KIOSK-1

Ethernet adapter Ethernet:

   Media State . . . . . . . . . . . : Media disconnected
   Physical Address. . . . . . . . . : 00-11-22-33-44-55
   DHCP Enabled. . . . . . . . . . . : Yes
`;

const ALL_REPLY: Pings = { gateway: true, publicAddress: true, publicName: true };
const NO_REPLY: Pings = { gateway: false, publicAddress: false, publicName: false };

describe("readAdapter", () => {
  it("reads the active adapter and skips a disconnected one listed before it", () => {
    expect(readAdapter(OFFICE_DESK)).toEqual({
      hostName: "DESK-07",
      ipv4: "10.13.2.17",
      mac: "00-1A-2B-3C-4D-5E",
      gateway: "10.13.2.254",
      isDhcpEnabled: true,
    });
  });

  it("reads a server with a static address (DHCP off)", () => {
    expect(readAdapter(LAB_SERVER)).toEqual({
      hostName: "LAB-SRV-2",
      ipv4: "192.168.50.10",
      mac: "A4-BB-6D-70-81-92",
      gateway: "192.168.50.1",
      isDhcpEnabled: false,
    });
  });

  it("reads an APIPA address from the Autoconfiguration IPv4 line, with an empty gateway", () => {
    expect(readAdapter(NO_LEASE_LAPTOP)).toEqual({
      hostName: "LAPTOP-3F",
      ipv4: "169.254.88.14",
      mac: "3C-52-82-AA-BB-CC",
      gateway: "",
      isDhcpEnabled: true,
    });
  });

  it("returns empty fields but the host name when no adapter has an address", () => {
    expect(readAdapter(UNPLUGGED)).toEqual({
      hostName: "KIOSK-1",
      ipv4: "",
      mac: "",
      gateway: "",
      isDhcpEnabled: false,
    });
  });

  it("handles Windows line endings", () => {
    expect(readAdapter(LAB_SERVER.replaceAll("\n", "\r\n")).ipv4).toBe("192.168.50.10");
  });
});

describe("diagnose", () => {
  it("says ok when every rung replies", () => {
    expect(diagnose({ adapter: readAdapter(OFFICE_DESK), pings: ALL_REPLY })).toBe("ok");
  });

  it("says no-address when the device has no IPv4 at all", () => {
    expect(diagnose({ adapter: readAdapter(UNPLUGGED), pings: NO_REPLY })).toBe("no-address");
  });

  it("blames DHCP, not the local network, for a 169.254 address", () => {
    expect(diagnose({ adapter: readAdapter(NO_LEASE_LAPTOP), pings: NO_REPLY })).toBe("no-dhcp");
  });

  it("blames the local network when the gateway does not reply", () => {
    expect(diagnose({ adapter: readAdapter(OFFICE_DESK), pings: NO_REPLY })).toBe("local-network");
  });

  it("blames the router or provider when the gateway replies but a public IP does not", () => {
    const pings = { gateway: true, publicAddress: false, publicName: false };
    expect(diagnose({ adapter: readAdapter(LAB_SERVER), pings })).toBe("internet");
  });

  it("blames DNS when a public IP replies but a name does not", () => {
    const pings = { gateway: true, publicAddress: true, publicName: false };
    expect(diagnose({ adapter: readAdapter(OFFICE_DESK), pings })).toBe("dns");
  });
});
