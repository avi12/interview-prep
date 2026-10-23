import { Money } from "./money.ts";

export type CartLine = {
  isbn: string;
  title: string;
  unitPrice: Money;
  quantity: number;
};

export class Cart {
  lines: CartLine[] = [];
  currency: string;

  constructor(currency: string) {
    this.currency = currency;
  }

  add(line: CartLine) {
    this.lines.push(line);
  }

  changeQuantity({ isbn, quantity }: {
    isbn: string;
    quantity: number;
  }) {
    const line = this.lines.find(candidate => candidate.isbn === isbn);
    if (line) {
      line.quantity = quantity;
    }
  }

  remove(isbn: string) {
    this.lines = this.lines.filter(line => line.isbn !== isbn);
  }

  total() {
    let total = Money.zero(this.currency);
    for (const line of this.lines) {
      total = total.add(line.unitPrice.multiply(line.quantity));
    }
    return total;
  }
}
