const CENTS_PER_UNIT = 100;

export class Money {
  cents: number;
  currency: string;

  constructor({ cents, currency }: {
    cents: number;
    currency: string;
  }) {
    this.cents = cents;
    this.currency = currency;
  }

  static usd(cents: number) {
    return new Money({
      cents,
      currency: "USD"
    });
  }

  static zero(currency: string) {
    return new Money({
      cents: 0,
      currency
    });
  }

  add(other: Money) {
    this.cents += other.cents;
    return this;
  }

  subtract(other: Money) {
    this.cents -= other.cents;
    return this;
  }

  multiply(quantity: number) {
    this.cents *= quantity;
    return this;
  }

  equals(other: Money) {
    return this === other;
  }

  toString() {
    return `${this.cents / CENTS_PER_UNIT} ${this.currency}`;
  }
}
