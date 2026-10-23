import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { Money } from "#kit/bookstore/money.ts";
import type * as PartsModule from "../starter/parts.ts";
import type * as NoticesModule from "../starter/notices.ts";
import type * as NotifierModule from "../starter/notifier.ts";

const { EmailChannel, SmsChannel } = await loadImpl<typeof PartsModule>({ testUrl: import.meta.url, file: "parts.ts" });
const { orderPlacedNotice, orderShippedNotice } = await loadImpl<typeof NoticesModule>({ testUrl: import.meta.url, file: "notices.ts" });
const { Notifier, SlackChannel, UrgentFormatter, DigestFormatter } = await loadImpl<typeof NotifierModule>({
  testUrl: import.meta.url,
  file: "notifier.ts"
});

type Channel = PartsModule.Channel;
type Formatter = PartsModule.Formatter;
type Notice = PartsModule.Notice;

const SMS_LIMIT = 160;
const SMS_BODY_LENGTH = 157;

const placed = orderPlacedNotice({ orderId: "1042", total: Money.usd(5997) });
const shipped = orderShippedNotice({ orderId: "1042" });

describe("SlackChannel", () => {
  it("posts the text with a package emoji", () => {
    const slack = new SlackChannel();

    slack.send("Order 1042 shipped");

    expect(slack.sent).toEqual(["[slack] :package: Order 1042 shipped"]);
  });

  it("keeps every message, in order", () => {
    const slack = new SlackChannel();

    slack.send("first");
    slack.send("second");

    expect(slack.sent).toEqual(["[slack] :package: first", "[slack] :package: second"]);
  });
});

describe("formatters turn notices into text and know nothing about channels", () => {
  it("urgent: shouts every notice on its own line", () => {
    expect(new UrgentFormatter().format([placed, shipped])).toBe(
      "URGENT: ORDER 1042 PLACED, TOTAL 59.97 USD\nURGENT: ORDER 1042 SHIPPED"
    );
  });

  it("digest: one header with the count, then a bullet per notice", () => {
    expect(new DigestFormatter().format([placed, shipped])).toBe(
      "Digest (2):\n- Order 1042 placed, total 59.97 USD\n- Order 1042 shipped"
    );
  });

  it("digest of a single notice still has the header", () => {
    expect(new DigestFormatter().format([shipped])).toBe("Digest (1):\n- Order 1042 shipped");
  });
});

describe("Notifier connects one channel to one formatter", () => {
  const channelFactories = [
    ["email", () => new EmailChannel()],
    ["sms", () => new SmsChannel()],
    ["slack", () => new SlackChannel()]
  ] as const;
  const formatterFactories = [
    ["urgent", () => new UrgentFormatter()],
    ["digest", () => new DigestFormatter()]
  ] as const;
  const combinations = channelFactories.flatMap(([channelName, makeChannel]) =>
    formatterFactories.map(([formatterName, makeFormatter]) => [channelName, formatterName, makeChannel, makeFormatter] as const)
  );

  it.each(combinations)("%s channel with %s formatter delivers the formatted text once", (_channelName, _formatterName, makeChannel, makeFormatter) => {
    const channel = makeChannel();
    const formatter = makeFormatter();
    new Notifier({ channel, formatter }).notify([shipped]);

    expect(channel.sent).toHaveLength(1);
    expect(channel.sent[0]).toContain(formatter.format([shipped]));
  });

  it("sends one message per call, not one per notice", () => {
    const channel = new EmailChannel();

    new Notifier({ channel, formatter: new DigestFormatter() }).notify([placed, shipped]);

    expect(channel.sent).toHaveLength(1);
  });

  it("sends nothing when there are no notices", () => {
    const channel = new EmailChannel();

    new Notifier({ channel, formatter: new DigestFormatter() }).notify([]);

    expect(channel.sent).toEqual([]);
  });

  it("the SMS length limit applies to every formatter, with no class per combination", () => {
    const manyNotices = Array.from({ length: 12 }, (_, index) => orderShippedNotice({ orderId: `order-${index}` }));
    const sms = new SmsChannel();
    const notifier = new Notifier({ channel: sms, formatter: new DigestFormatter() });
    notifier.notify(manyNotices);
    notifier.useFormatter(new UrgentFormatter());
    notifier.notify(manyNotices);

    for (const message of sms.sent) {
      const body = message.replace("[sms] ", "");
      expect(body).toHaveLength(SMS_LIMIT);
      expect(body.endsWith("...")).toBe(true);
    }
    expect(sms.sent).toHaveLength(2);
    expect(sms.sent[0]).toBe(`[sms] ${new DigestFormatter().format(manyNotices).slice(0, SMS_BODY_LENGTH)}...`);
  });

  it("switches channel at runtime: later messages go to the new one", () => {
    const email = new EmailChannel();
    const sms = new SmsChannel();
    const notifier = new Notifier({ channel: email, formatter: new DigestFormatter() });

    notifier.notify([placed]);
    notifier.useChannel(sms);
    notifier.notify([shipped]);

    expect(email.sent).toHaveLength(1);
    expect(sms.sent).toEqual(["[sms] Digest (1):\n- Order 1042 shipped"]);
  });

  it("switches formatter at runtime: later messages look different", () => {
    const email = new EmailChannel();
    const notifier = new Notifier({ channel: email, formatter: new DigestFormatter() });

    notifier.notify([shipped]);
    notifier.useFormatter(new UrgentFormatter());
    notifier.notify([shipped]);

    expect(email.sent).toEqual(["[email] Digest (1):\n- Order 1042 shipped", "[email] URGENT: ORDER 1042 SHIPPED"]);
  });

  it("two notifiers do not share their parts", () => {
    const first = new EmailChannel();
    const second = new EmailChannel();
    const notifierOne = new Notifier({ channel: first, formatter: new DigestFormatter() });
    const notifierTwo = new Notifier({ channel: second, formatter: new DigestFormatter() });

    notifierOne.useChannel(new SmsChannel());
    notifierTwo.notify([shipped]);

    expect(second.sent).toHaveLength(1);
    expect(first.sent).toHaveLength(0);
  });
});

describe("new parts plug in without changing any of your code", () => {
  class PigeonChannel implements Channel {
    readonly sent: string[] = [];

    send(text: string) {
      this.sent.push(`a pigeon carries: ${text}`);
    }
  }

  class CsvFormatter implements Formatter {
    format(notices: readonly Notice[]) {
      return notices.map(notice => `${notice.orderId},${notice.text}`).join(";");
    }
  }

  class FormatterSpy implements Formatter {
    readonly received: (readonly Notice[])[] = [];

    format(notices: readonly Notice[]) {
      this.received.push(notices);
      return "formatted";
    }
  }

  class ChannelSpy implements Channel {
    readonly texts: string[] = [];

    send(text: string) {
      this.texts.push(text);
    }
  }

  it("a channel written later works with the existing formatters", () => {
    const pigeon = new PigeonChannel();

    new Notifier({ channel: pigeon, formatter: new UrgentFormatter() }).notify([shipped]);

    expect(pigeon.sent).toEqual(["a pigeon carries: URGENT: ORDER 1042 SHIPPED"]);
  });

  it("a formatter written later works with the existing channels", () => {
    const email = new EmailChannel();

    new Notifier({ channel: email, formatter: new CsvFormatter() }).notify([placed, shipped]);

    expect(email.sent).toEqual(["[email] 1042,Order 1042 placed, total 59.97 USD;1042,Order 1042 shipped"]);
  });

  it("both new parts together", () => {
    const pigeon = new PigeonChannel();

    new Notifier({ channel: pigeon, formatter: new CsvFormatter() }).notify([shipped]);

    expect(pigeon.sent).toEqual(["a pigeon carries: 1042,Order 1042 shipped"]);
  });

  it("swaps from a built-in part to a new one at runtime", () => {
    const sms = new SmsChannel();
    const pigeon = new PigeonChannel();
    const notifier = new Notifier({ channel: sms, formatter: new DigestFormatter() });

    notifier.notify([shipped]);
    notifier.useChannel(pigeon);
    notifier.useFormatter(new CsvFormatter());
    notifier.notify([shipped]);

    expect(sms.sent).toHaveLength(1);
    expect(pigeon.sent).toEqual(["a pigeon carries: 1042,Order 1042 shipped"]);
  });

  it("the notifier only passes the notices to the formatter and the finished text to the channel", () => {
    const formatter = new FormatterSpy();
    const channel = new ChannelSpy();

    new Notifier({ channel, formatter }).notify([placed, shipped]);

    expect(formatter.received).toHaveLength(1);
    expect([...formatter.received[0]]).toEqual([placed, shipped]);
    expect(channel.texts).toEqual(["formatted"]);
  });
});
