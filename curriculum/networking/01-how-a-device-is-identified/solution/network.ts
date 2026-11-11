export const VERDICT = {
  noAddress: "no-address",
  noDhcp: "no-dhcp",
  localNetwork: "local-network",
  internet: "internet",
  dns: "dns",
  ok: "ok",
} as const;

export type Verdict = (typeof VERDICT)[keyof typeof VERDICT];

export type Adapter = {
  hostName: string;
  ipv4: string;
  mac: string;
  gateway: string;
  isDhcpEnabled: boolean;
};

export type Pings = { gateway: boolean; publicAddress: boolean; publicName: boolean };

const VALUE_LINE = /^\s+(\S.*?)[ .]*:\s*(.*)$/;
const IPV4_KEYS = new Set(["IPv4 Address", "Autoconfiguration IPv4 Address"]);
const APIPA_PREFIX = "169.254.";
const PREFERRED_SUFFIX = "(Preferred)";

type Section = Map<string, string>;

const readSections = (ipconfigOutput: string) => {
  const sections: Section[] = [];
  for (const line of ipconfigOutput.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const match = VALUE_LINE.exec(line);
    if (!match) {
      sections.push(new Map());
      continue;
    }
    sections.at(-1)?.set(match[1], match[2].trim());
  }
  return sections;
};

const ipv4Of = (section: Section) => {
  for (const key of IPV4_KEYS) {
    const value = section.get(key);
    if (value) return value.replace(PREFERRED_SUFFIX, "");
  }
  return "";
};

export function readAdapter(ipconfigOutput: string) {
  const [header, ...adapters] = readSections(ipconfigOutput);
  const active = adapters.find(section => ipv4Of(section) !== "") ?? new Map<string, string>();
  return {
    hostName: header?.get("Host Name") ?? "",
    ipv4: ipv4Of(active),
    mac: active.get("Physical Address") ?? "",
    gateway: active.get("Default Gateway") ?? "",
    isDhcpEnabled: active.get("DHCP Enabled") === "Yes",
  };
}

export function diagnose({ adapter, pings }: { adapter: Adapter; pings: Pings }): Verdict {
  if (adapter.ipv4 === "") return VERDICT.noAddress;
  if (adapter.ipv4.startsWith(APIPA_PREFIX)) return VERDICT.noDhcp;
  if (!pings.gateway) return VERDICT.localNetwork;
  if (!pings.publicAddress) return VERDICT.internet;
  if (!pings.publicName) return VERDICT.dns;
  return VERDICT.ok;
}
