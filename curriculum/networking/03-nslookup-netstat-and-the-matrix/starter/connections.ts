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

export function parseConnections(netstatOutput: string): Connection[] {
  return [];
}

export function firstCommand(symptom: Symptom): FirstCommand {
  return FIRST_COMMAND.renew;
}
