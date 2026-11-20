export const SYMPTOM = {
  limitedConnection: "limited-connection",
  sitesWillNotLoad: "sites-will-not-load",
  slowWithLoss: "slow-with-loss",
  secretTraffic: "secret-traffic",
  noRemoteNetworks: "no-remote-networks",
} as const;

export type Symptom = (typeof SYMPTOM)[keyof typeof SYMPTOM];

export const FIRST_COMMAND = {
  renew: "ipconfig /renew",
  nslookup: "nslookup",
  tracert: "tracert",
  owners: "netstat -b",
  routes: "netstat -r",
} as const;

export type FirstCommand = (typeof FIRST_COMMAND)[keyof typeof FIRST_COMMAND];

export type Connection = {
  protocol: string;
  localPort: number;
  foreignAddress: string;
  state: string;
};

const PROTOCOLS = new Set(["TCP", "UDP"]);
const COLUMNS_WITHOUT_STATE = 3;

const COMMAND_BY_SYMPTOM: Record<Symptom, FirstCommand> = {
  [SYMPTOM.limitedConnection]: FIRST_COMMAND.renew,
  [SYMPTOM.sitesWillNotLoad]: FIRST_COMMAND.nslookup,
  [SYMPTOM.slowWithLoss]: FIRST_COMMAND.tracert,
  [SYMPTOM.secretTraffic]: FIRST_COMMAND.owners,
  [SYMPTOM.noRemoteNetworks]: FIRST_COMMAND.routes,
};

const readPort = (address: string) => Number(address.slice(address.lastIndexOf(":") + 1));

export function parseConnections(netstatOutput: string): Connection[] {
  const connections: Connection[] = [];
  for (const line of netstatOutput.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (!PROTOCOLS.has(columns[0])) continue;
    connections.push({
      protocol: columns[0],
      localPort: readPort(columns[1]),
      foreignAddress: columns[2],
      state: columns.length > COLUMNS_WITHOUT_STATE ? columns[3] : "",
    });
  }
  return connections;
}

export function firstCommand(symptom: Symptom): FirstCommand {
  return COMMAND_BY_SYMPTOM[symptom];
}
