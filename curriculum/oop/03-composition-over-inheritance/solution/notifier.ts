import type { Channel, Formatter, Notice } from "./parts.ts";

const SLACK_PREFIX = "[slack] :package: ";
const URGENT_PREFIX = "URGENT: ";
const LINE_SEPARATOR = "\n";

export class SlackChannel implements Channel {
  readonly sent: string[] = [];

  send(text: string) {
    this.sent.push(`${SLACK_PREFIX}${text}`);
  }
}

export class UrgentFormatter implements Formatter {
  format(notices: readonly Notice[]) {
    return notices.map(notice => `${URGENT_PREFIX}${notice.text.toUpperCase()}`).join(LINE_SEPARATOR);
  }
}

export class DigestFormatter implements Formatter {
  format(notices: readonly Notice[]) {
    const items = notices.map(notice => `- ${notice.text}`);
    return [`Digest (${notices.length}):`, ...items].join(LINE_SEPARATOR);
  }
}

export class Notifier {
  #channel: Channel;
  #formatter: Formatter;

  constructor({ channel, formatter }: {
    channel: Channel;
    formatter: Formatter;
  }) {
    this.#channel = channel;
    this.#formatter = formatter;
  }

  useChannel(channel: Channel) {
    this.#channel = channel;
  }

  useFormatter(formatter: Formatter) {
    this.#formatter = formatter;
  }

  notify(notices: readonly Notice[]) {
    if (notices.length === 0) {
      return;
    }

    this.#channel.send(this.#formatter.format(notices));
  }
}
