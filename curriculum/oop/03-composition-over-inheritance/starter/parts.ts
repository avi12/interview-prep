export type Notice = { orderId: string; text: string };

export interface Channel {
  send(text: string): void;
}

export interface Formatter {
  format(notices: readonly Notice[]): string;
}

const SMS_MAX_LENGTH = 160;
const ELLIPSIS = "...";

export class EmailChannel implements Channel {
  readonly sent: string[] = [];

  send(text: string) {
    this.sent.push(`[email] ${text}`);
  }
}

export class SmsChannel implements Channel {
  readonly sent: string[] = [];

  send(text: string) {
    const fits = text.length <= SMS_MAX_LENGTH;
    const body = fits ? text : `${text.slice(0, SMS_MAX_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`;
    this.sent.push(`[sms] ${body}`);
  }
}
