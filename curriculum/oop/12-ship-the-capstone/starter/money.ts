const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CENTS_PER_UNIT = 100;
const CENT_DIGITS = 2;
const PERCENT_DIVISOR = 100;
const US_DOLLAR = "USD";

export class Money {
  readonly cents: number;
  readonly currency: string;

  constructor({ cents, currency }: {
    cents: number;
    currency: string;
  }) {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new RangeError(`money needs whole cents, zero or more, got ${cents}`);
    }

    if (!CURRENCY_PATTERN.test(currency)) {
      throw new RangeError(`currency must be three capital letters, got "${currency}"`);
    }

    this.cents = cents;
    this.currency = currency;
    Object.freeze(this);
  }

  static usd(cents: number) {
    return new Money({
      cents,
      currency: US_DOLLAR
    });
  }

  static zero(currency: string = US_DOLLAR) {
    return new Money({
      cents: 0,
      currency
    });
  }

  add(other: Money) {
    this.requireSameCurrency(other);
    return new Money({
      cents: this.cents + other.cents,
      currency: this.currency
    });
  }

  subtract(other: Money) {
    this.requireSameCurrency(other);
    return new Money({
      cents: this.cents - other.cents,
      currency: this.currency
    });
  }

  multiply(quantity: number) {
    return new Money({
      cents: this.cents * quantity,
      currency: this.currency
    });
  }

  percentOf(percent: number) {
    return new Money({
      cents: Math.round((this.cents * percent) / PERCENT_DIVISOR),
      currency: this.currency
    });
  }

  isGreaterThan(other: Money) {
    this.requireSameCurrency(other);
    return this.cents > other.cents;
  }

  isZero() {
    return this.cents === 0;
  }

  equals(other: Money) {
    return this.cents === other.cents && this.currency === other.currency;
  }

  toString() {
    const whole = Math.floor(this.cents / CENTS_PER_UNIT);
    const fraction = String(this.cents % CENTS_PER_UNIT).padStart(CENT_DIGITS, "0");
    return `${whole}.${fraction} ${this.currency}`;
  }

  private requireSameCurrency(other: Money) {
    if (other.currency === this.currency) {
      return;
    }

    throw new RangeError(`cannot mix ${this.currency} and ${other.currency}`);
  }
}
