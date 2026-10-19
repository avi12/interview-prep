import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type * as ErrorModule from "../starter/domainError.ts";
import type * as MoneyModule from "../starter/money.ts";
import type * as CartModule from "../starter/cart.ts";

const { DomainError } = await loadImpl<typeof ErrorModule>({ testUrl: import.meta.url, file: "domainError.ts" });
const { Money } = await loadImpl<typeof MoneyModule>({ testUrl: import.meta.url, file: "money.ts" });
const { Cart } = await loadImpl<typeof CartModule>({ testUrl: import.meta.url, file: "cart.ts" });

const MAX_COPIES = 10;

const show = (money: InstanceType<typeof Money>) => money.toString();

const attemptTo = (action: () => void) => {
  try {
    action();
  } catch {
    return;
  }
};

const book = (overrides: Partial<CartModule.CartLine> = {}) => ({
  isbn: "isbn-clean-code",
  title: "Clean Code",
  unitPrice: Money.usd(1999),
  quantity: 1,
  ...overrides
});

describe("Money is a value object", () => {
  it("keeps whole cents and a currency", () => {
    const price = new Money({ cents: 1999, currency: "USD" });

    expect(price.cents).toBe(1999);
    expect(price.currency).toBe("USD");
  });

  it.each([10.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60])("refuses %s cents, only whole safe numbers are money", cents => {
    expect(() => new Money({ cents, currency: "USD" })).toThrow(DomainError);
  });

  it("refuses a negative amount", () => {
    expect(() => Money.usd(-1)).toThrow(DomainError);
  });

  it.each(["usd", "US", "DOLLAR", "US1", ""])('refuses the currency code "%s"', currency => {
    expect(() => new Money({ cents: 100, currency })).toThrow(DomainError);
  });

  it("accepts any three-letter code, not only the ones the author listed", () => {
    expect(show(new Money({ cents: 250, currency: "GBP" }))).toBe("2.50 GBP");
  });

  it("adds two amounts of the same currency", () => {
    expect(show(Money.usd(1999).add(Money.usd(501)))).toBe("25.00 USD");
  });

  it("refuses to add two different currencies", () => {
    const euros = new Money({ cents: 100, currency: "EUR" });

    expect(() => Money.usd(100).add(euros)).toThrow(DomainError);
  });

  it("subtracts, and refuses to go below zero", () => {
    expect(show(Money.usd(1000).subtract(Money.usd(1)))).toBe("9.99 USD");
    expect(() => Money.usd(1).subtract(Money.usd(2))).toThrow(DomainError);
  });

  it("multiplies by a whole quantity without float errors: 3 x 19.99 is exactly 59.97", () => {
    expect(show(Money.usd(1999).multiply(3))).toBe("59.97 USD");
  });

  it.each([-1, 1.5, Number.NaN])("refuses to multiply by %s", quantity => {
    expect(() => Money.usd(100).multiply(quantity)).toThrow(DomainError);
  });

  it("returns a new Money and leaves both operands alone", () => {
    const price = Money.usd(1000);
    const extra = Money.usd(250);

    const sum = price.add(extra);

    expect(show(price)).toBe("10.00 USD");
    expect(show(extra)).toBe("2.50 USD");
    expect(show(sum)).toBe("12.50 USD");
    expect(sum).not.toBe(price);
  });

  it("returns a new Money from multiply too", () => {
    const price = Money.usd(1000);

    price.multiply(5);

    expect(show(price)).toBe("10.00 USD");
  });

  it("cannot be edited from outside after it is made", () => {
    const price = Money.usd(1000);

    Reflect.set(price, "cents", 1);
    Reflect.set(price, "currency", "EUR");

    expect(show(price)).toBe("10.00 USD");
  });

  it("is equal to another Money with the same cents and currency", () => {
    expect(Money.usd(500).equals(Money.usd(500))).toBe(true);
  });

  it("is not equal when the cents or the currency differ", () => {
    expect(Money.usd(500).equals(Money.usd(501))).toBe(false);
    expect(Money.usd(500).equals(new Money({ cents: 500, currency: "EUR" }))).toBe(false);
  });

  it.each([
    [0, "0.00 USD"],
    [5, "0.05 USD"],
    [100, "1.00 USD"],
    [5997, "59.97 USD"]
  ])("prints %s cents as %s", (cents, text) => {
    expect(show(Money.usd(cents))).toBe(text);
  });
});

describe("Cart cannot be put in an invalid state", () => {
  it("an empty cart totals zero in its own currency", () => {
    expect(show(new Cart("USD").total())).toBe("0.00 USD");
  });

  it("totals unit price times quantity over all lines", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 3 }));
    cart.add(book({ isbn: "isbn-pragmatic", title: "The Pragmatic Programmer", unitPrice: Money.usd(500) }));

    expect(show(cart.total())).toBe("64.97 USD");
  });

  it("keeps lines in the order they were added", () => {
    const cart = new Cart("USD");
    cart.add(book());
    cart.add(book({ isbn: "isbn-pragmatic", title: "The Pragmatic Programmer" }));

    expect(cart.lines.map(line => line.title)).toEqual(["Clean Code", "The Pragmatic Programmer"]);
  });

  it("adding the same isbn again merges into one line", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 2 }));
    cart.add(book({ quantity: 3 }));

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(5);
  });

  it.each([0, -1, 1.5, Number.NaN, MAX_COPIES + 1])("refuses quantity %s and stays empty", quantity => {
    const cart = new Cart("USD");

    expect(() => cart.add(book({ quantity }))).toThrow(DomainError);
    expect(cart.lines).toHaveLength(0);
  });

  it("allows exactly ten copies of a title", () => {
    const cart = new Cart("USD");

    cart.add(book({ quantity: MAX_COPIES }));

    expect(cart.lines[0].quantity).toBe(MAX_COPIES);
  });

  it("refuses a merge that would pass ten copies and keeps the old quantity", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 6 }));

    expect(() => cart.add(book({ quantity: 5 }))).toThrow(DomainError);
    expect(cart.lines[0].quantity).toBe(6);
  });

  it("refuses a negative quantity even when the merged total would look valid", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 6 }));

    expect(() => cart.add(book({ quantity: -1 }))).toThrow(DomainError);
    expect(cart.lines[0].quantity).toBe(6);
  });

  it("refuses a price in another currency", () => {
    const cart = new Cart("USD");
    const euroPrice = new Money({ cents: 1999, currency: "EUR" });

    expect(() => cart.add(book({ unitPrice: euroPrice }))).toThrow(DomainError);
    expect(cart.lines).toHaveLength(0);
  });

  it("changeQuantity applies the same rules", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 2 }));

    cart.changeQuantity({ isbn: "isbn-clean-code", quantity: 4 });
    expect(cart.lines[0].quantity).toBe(4);

    expect(() => cart.changeQuantity({ isbn: "isbn-clean-code", quantity: 0 })).toThrow(DomainError);
    expect(() => cart.changeQuantity({ isbn: "isbn-clean-code", quantity: MAX_COPIES + 1 })).toThrow(DomainError);
    expect(cart.lines[0].quantity).toBe(4);
  });

  it("changeQuantity on a title that is not in the cart is an error", () => {
    expect(() => new Cart("USD").changeQuantity({ isbn: "nope", quantity: 1 })).toThrow(DomainError);
  });

  it("remove drops a line, and an unknown isbn is an error", () => {
    const cart = new Cart("USD");
    cart.add(book());

    expect(() => cart.remove("nope")).toThrow(DomainError);
    cart.remove("isbn-clean-code");

    expect(cart.lines).toHaveLength(0);
  });

  it("hands out a snapshot of the lines, so editing it does not edit the cart", () => {
    const cart = new Cart("USD");
    cart.add(book({ quantity: 2 }));

    const lines = cart.lines;
    attemptTo(() => lines.push(book({ isbn: "sneaky", quantity: 99 })));
    attemptTo(() => Reflect.set(lines[0], "quantity", -50));

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
  });

  it("keeps its own copy of what you add, so editing your object later changes nothing", () => {
    const cart = new Cart("USD");
    const line = book({ quantity: 2 });
    cart.add(line);

    attemptTo(() => Reflect.set(line, "quantity", 99));

    expect(cart.lines[0].quantity).toBe(2);
  });

  it("works in a currency the author never listed", () => {
    const cart = new Cart("GBP");
    cart.add(book({ unitPrice: new Money({ cents: 1000, currency: "GBP" }), quantity: 2 }));

    expect(show(cart.total())).toBe("20.00 GBP");
  });

  it("refuses to be created in a made-up currency", () => {
    expect(() => new Cart("pounds")).toThrow(DomainError);
  });
});
