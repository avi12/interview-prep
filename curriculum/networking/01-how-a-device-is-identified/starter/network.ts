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

export function readAdapter(ipconfigOutput: string): Adapter {
  return { hostName: "", ipv4: "", mac: "", gateway: "", isDhcpEnabled: false };
}

export function diagnose({ adapter, pings }: { adapter: Adapter; pings: Pings }): Verdict {
  return VERDICT.ok;
}
