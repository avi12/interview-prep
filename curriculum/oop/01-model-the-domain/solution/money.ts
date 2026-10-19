import { DomainError } from "./domainError.ts";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CENTS_PER_UNIT = 100;
const CENT_DIGITS = 2;
const US_DOLLAR = "USD";

export class Money {
  readonly #cents: number;
  readonly #currency: string;

  constructor({ cents, currency }: { cents: number; currency: string }) {
    if (!Number.isSafeInteger(cents)) throw new DomainError(`money needs whole cents, got ${cents}`);
    if (cents < 0) throw new DomainError(`money cannot be negative, got ${cents}`);
    if (!CURRENCY_PATTERN.test(currency)) throw new DomainError(`currency must be three capital letters, got "${currency}"`);
    this.#cents = cents;
    this.#currency = currency;
  }

  static usd(cents: number) {
    return new Money({ cents, currency: US_DOLLAR });
  }

  static zero(currency: string) {
    return new Money({ cents: 0, currency });
  }

  get cents() {
    return this.#cents;
  }

  get currency() {
    return this.#currency;
  }

  add(other: Money) {
    this.#requireSameCurrency(other);
    return new Money({ cents: this.#cents + other.#cents, currency: this.#currency });
  }

  subtract(other: Money) {
    this.#requireSameCurrency(other);
    return new Money({ cents: this.#cents - other.#cents, currency: this.#currency });
  }

  multiply(quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new DomainError(`quantity must be a whole number, got ${quantity}`);
    return new Money({ cents: this.#cents * quantity, currency: this.#currency });
  }

  equals(other: Money) {
    return other instanceof Money && this.#cents === other.#cents && this.#currency === other.#currency;
  }

  toString() {
    const whole = Math.floor(this.#cents / CENTS_PER_UNIT);
    const fraction = String(this.#cents % CENTS_PER_UNIT).padStart(CENT_DIGITS, "0");
    return `${whole}.${fraction} ${this.#currency}`;
  }

  #requireSameCurrency(other: Money) {
    if (other.#currency === this.#currency) return;
    throw new DomainError(`cannot mix ${this.#currency} and ${other.#currency}`);
  }
}
