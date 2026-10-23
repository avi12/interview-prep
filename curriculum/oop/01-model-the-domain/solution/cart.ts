import { DomainError } from "./domainError.ts";
import { Money } from "./money.ts";

export type CartLine = {
  isbn: string;
  title: string;
  unitPrice: Money;
  quantity: number;
};

const MIN_COPIES_PER_TITLE = 1;
const MAX_COPIES_PER_TITLE = 10;

function copyOf(line: CartLine) {
  return { ...line };
}

function requireValidQuantity(quantity: number) {
  const isWholeNumber = Number.isSafeInteger(quantity);
  const isInRange = quantity >= MIN_COPIES_PER_TITLE && quantity <= MAX_COPIES_PER_TITLE;
  if (isWholeNumber && isInRange) {
    return;
  }

  throw new DomainError(`quantity must be a whole number from ${MIN_COPIES_PER_TITLE} to ${MAX_COPIES_PER_TITLE}, got ${quantity}`);
}

export class Cart {
  readonly #currency: string;
  readonly #lines = new Map<string, CartLine>();

  constructor(currency: string) {
    this.#currency = Money.zero(currency).currency;
  }

  get lines() {
    return [...this.#lines.values()].map(copyOf);
  }

  add(line: CartLine) {
    if (line.unitPrice.currency !== this.#currency) {
      throw new DomainError(`this cart is in ${this.#currency}, not ${line.unitPrice.currency}`);
    }

    requireValidQuantity(line.quantity);
    const existing = this.#lines.get(line.isbn);
    const quantity = (existing?.quantity ?? 0) + line.quantity;
    requireValidQuantity(quantity);
    this.#lines.set(line.isbn, {
      ...(existing ?? line),
      quantity
    });
  }

  changeQuantity({ isbn, quantity }: {
    isbn: string;
    quantity: number;
  }) {
    const line = this.#lineFor(isbn);
    requireValidQuantity(quantity);
    this.#lines.set(isbn, {
      ...line,
      quantity
    });
  }

  remove(isbn: string) {
    this.#lineFor(isbn);
    this.#lines.delete(isbn);
  }

  total() {
    let total = Money.zero(this.#currency);
    for (const line of this.#lines.values()) {
      total = total.add(line.unitPrice.multiply(line.quantity));
    }
    return total;
  }

  #lineFor(isbn: string) {
    const line = this.#lines.get(isbn);
    if (!line) {
      throw new DomainError(`no line for ${isbn} in this cart`);
    }

    return line;
  }
}
