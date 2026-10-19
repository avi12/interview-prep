import type { Channel, Formatter, Notice } from "./parts.ts";

export class SlackChannel implements Channel {
  readonly sent: string[] = [];

  send(_text: string) {
    throw new Error("not implemented");
  }
}

export class UrgentFormatter implements Formatter {
  format(_notices: readonly Notice[]): string {
    throw new Error("not implemented");
  }
}

export class DigestFormatter implements Formatter {
  format(_notices: readonly Notice[]): string {
    throw new Error("not implemented");
  }
}

export class Notifier {
  constructor(_options: { channel: Channel; formatter: Formatter }) {}

  useChannel(_channel: Channel) {
    throw new Error("not implemented");
  }

  useFormatter(_formatter: Formatter) {
    throw new Error("not implemented");
  }

  notify(_notices: readonly Notice[]) {
    throw new Error("not implemented");
  }
}
