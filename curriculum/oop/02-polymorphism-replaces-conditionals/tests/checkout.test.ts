import type * as CheckoutModule from "../starter/checkout.ts";
import type * as DiscountsModule from "../starter/discounts.ts";
import { Money } from "#kit/bookstore/money.ts";
import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

const { PercentOff, BuyTwoGetOneFree, FreeShippingFrom } = await loadImpl<typeof DiscountsModule>({
  testUrl: import.meta.url,
  file: "discounts.ts"
});
const { Checkout } = await loadImpl<typeof CheckoutModule>({
  testUrl: import.meta.url,
  file: "checkout.ts"
});

type DiscountRule = DiscountsModule.DiscountRule;
type PricedLine = DiscountsModule.PricedLine;
type PricingContext = DiscountsModule.PricingContext;

const SHIPPING = Money.usd(599);
const FREE_SHIPPING_THRESHOLD = Money.usd(5000);

function line({ isbn, cents, quantity }: {
  isbn: string;
  cents: number;
  quantity: number;
}): PricedLine {
  return {
    isbn,
    title: `Title ${isbn}`,
    unitPrice: Money.usd(cents),
    quantity
  };
}

function contextOf(lines: PricedLine[]): PricingContext {
  let subtotal = Money.zero("USD");
  for (const entry of lines) {
    subtotal = subtotal.add(entry.unitPrice.multiply(entry.quantity));
  }
  return {
    lines,
    subtotal,
    shippingFee: SHIPPING
  };
}

function show(money: Money) {
  return money.toString();
}

function receiptOf(quote: CheckoutModule.Quote) {
  return quote.discounts.map(discount => `${discount.rule}: ${discount.amount}`);
}

describe("PercentOff", () => {
  it("takes the percentage of the subtotal, rounded to the nearest cent", () => {
    const context = contextOf([line({
      isbn: "a",
      cents: 1999,
      quantity: 2
    })]);

    expect(show(new PercentOff({ percent: 10 }).discountFor(context))).toBe("4.00 USD");
  });

  it("rounds down when the fraction is under half a cent: 15% of 10.03 is 1.50", () => {
    const small = contextOf([line({
      isbn: "a",
      cents: 1003,
      quantity: 1
    })]);

    expect(show(new PercentOff({ percent: 15 }).discountFor(small))).toBe("1.50 USD");
  });

  it("names itself after its percentage", () => {
    expect(new PercentOff({ percent: 10 }).name).toBe("10% off");
    expect(new PercentOff({ percent: 25 }).name).toBe("25% off");
  });

  it("gives nothing on an empty cart", () => {
    expect(show(new PercentOff({ percent: 10 }).discountFor(contextOf([])))).toBe("0.00 USD");
  });
});

describe("BuyTwoGetOneFree", () => {
  function discountFor(lines: PricedLine[]) {
    return show(new BuyTwoGetOneFree().discountFor(contextOf(lines)));
  }

  it("gives nothing for two copies", () => {
    expect(
      discountFor([line({
        isbn: "a",
        cents: 2000,
        quantity: 2
      })])
    ).toBe("0.00 USD");
  });

  it("makes the third copy free", () => {
    expect(
      discountFor([line({
        isbn: "a",
        cents: 2000,
        quantity: 3
      })])
    ).toBe("20.00 USD");
  });

  it("counts only complete groups of three: five copies give one free, six give two", () => {
    expect(
      discountFor([line({
        isbn: "a",
        cents: 2000,
        quantity: 5
      })])
    ).toBe("20.00 USD");
    expect(
      discountFor([line({
        isbn: "a",
        cents: 2000,
        quantity: 6
      })])
    ).toBe("40.00 USD");
  });

  it("counts each title on its own", () => {
    const lines = [line({
      isbn: "a",
      cents: 2000,
      quantity: 2
    }), line({
      isbn: "b",
      cents: 1250,
      quantity: 1
    })];

    expect(discountFor(lines)).toBe("0.00 USD");
  });

  it("adds up the free copies of different titles", () => {
    const lines = [line({
      isbn: "a",
      cents: 2000,
      quantity: 3
    }), line({
      isbn: "b",
      cents: 1250,
      quantity: 3
    })];

    expect(discountFor(lines)).toBe("32.50 USD");
  });

  it("has a name for the receipt", () => {
    expect(new BuyTwoGetOneFree().name).toBe("Buy 2 get 1 free");
  });
});

describe("FreeShippingFrom", () => {
  const rule = new FreeShippingFrom({ threshold: FREE_SHIPPING_THRESHOLD });

  it("waives the shipping fee when the subtotal reaches the threshold", () => {
    const context = contextOf([line({
      isbn: "a",
      cents: 5000,
      quantity: 1
    })]);

    expect(show(rule.discountFor(context))).toBe("5.99 USD");
  });

  it("gives nothing one cent below the threshold", () => {
    const context = contextOf([line({
      isbn: "a",
      cents: 4999,
      quantity: 1
    })]);

    expect(show(rule.discountFor(context))).toBe("0.00 USD");
  });

  it("waives whatever fee the context carries", () => {
    const context = {
      ...contextOf([line({
        isbn: "a",
        cents: 9000,
        quantity: 1
      })]),
      shippingFee: Money.usd(300)
    };

    expect(show(rule.discountFor(context))).toBe("3.00 USD");
  });

  it("has a name for the receipt", () => {
    expect(rule.name).toBe("Free shipping");
  });
});

describe("Checkout applies whatever rules it is given", () => {
  const threeTwentyDollarBooks = [line({
    isbn: "a",
    cents: 2000,
    quantity: 3
  })];

  it("with no rules, the total is the subtotal plus shipping", () => {
    const quote = new Checkout({ rules: [] }).quote({
      lines: threeTwentyDollarBooks,
      shippingFee: SHIPPING
    });

    expect(show(quote.subtotal)).toBe("60.00 USD");
    expect(show(quote.shippingFee)).toBe("5.99 USD");
    expect(show(quote.total)).toBe("65.99 USD");
    expect(quote.discounts).toEqual([]);
  });

  it("subtracts the discount of a single rule and lists it by name", () => {
    const lines = [line({
      isbn: "a",
      cents: 1999,
      quantity: 2
    })];
    const quote = new Checkout({ rules: [new PercentOff({ percent: 10 })] }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(receiptOf(quote)).toEqual(["10% off: 4.00 USD"]);
    expect(show(quote.total)).toBe("41.97 USD");
  });

  it("stacks several rules and lists them in the order they were given", () => {
    const rules = [
      new BuyTwoGetOneFree(),
      new PercentOff({ percent: 10 }),
      new FreeShippingFrom({ threshold: FREE_SHIPPING_THRESHOLD })
    ];
    const quote = new Checkout({ rules }).quote({
      lines: threeTwentyDollarBooks,
      shippingFee: SHIPPING
    });

    expect(receiptOf(quote)).toEqual(["Buy 2 get 1 free: 20.00 USD", "10% off: 6.00 USD", "Free shipping: 5.99 USD"]);
    expect(show(quote.total)).toBe("34.00 USD");
  });

  it("does not list a rule that gave nothing", () => {
    const lines = [line({
      isbn: "a",
      cents: 2000,
      quantity: 2
    })];
    const quote = new Checkout({ rules: [new BuyTwoGetOneFree()] }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(quote.discounts).toEqual([]);
    expect(show(quote.total)).toBe("45.99 USD");
  });

  it("never lets the total go below zero", () => {
    const rules = [
      new PercentOff({ percent: 100 }),
      new BuyTwoGetOneFree(),
      new FreeShippingFrom({ threshold: Money.usd(0) })
    ];
    const quote = new Checkout({ rules }).quote({
      lines: threeTwentyDollarBooks,
      shippingFee: SHIPPING
    });

    expect(show(quote.total)).toBe("0.00 USD");
  });
});

describe("a rule the author never saw plugs in without changing any of your code", () => {
  class AuthorDay implements DiscountRule {
    readonly name = "Author day";
    readonly #isbns: ReadonlySet<string>;

    constructor(isbns: string[]) {
      this.#isbns = new Set(isbns);
    }

    discountFor({ lines, subtotal }: PricingContext) {
      let discount = Money.zero(subtotal.currency);
      for (const entry of lines) {
        if (!this.#isbns.has(entry.isbn)) {
          continue;
        }

        discount = discount.add(entry.unitPrice.multiply(entry.quantity).percentage(50));
      }
      return discount;
    }
  }

  class ContextSpy implements DiscountRule {
    readonly name = "Spy";
    readonly seen: PricingContext[] = [];

    discountFor(context: PricingContext) {
      this.seen.push(context);
      return Money.zero(context.subtotal.currency);
    }
  }

  const lines = [line({
    isbn: "isbn-a",
    cents: 2000,
    quantity: 2
  }), line({
    isbn: "isbn-b",
    cents: 1000,
    quantity: 1
  })];

  it("applies a brand new class and prints its own name", () => {
    const quote = new Checkout({ rules: [new AuthorDay(["isbn-a"])] }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(receiptOf(quote)).toEqual(["Author day: 20.00 USD"]);
    expect(show(quote.total)).toBe("35.99 USD");
  });

  it("mixes with the built-in rules, in the order given", () => {
    const rules = [new PercentOff({ percent: 10 }), new AuthorDay(["isbn-a"])];
    const quote = new Checkout({ rules }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(receiptOf(quote)).toEqual(["10% off: 5.00 USD", "Author day: 20.00 USD"]);
    expect(show(quote.total)).toBe("30.99 USD");
  });

  it("accepts a plain object that has the right shape, not only classes", () => {
    const loyalty: DiscountRule = {
      name: "Loyalty",
      discountFor: () => Money.usd(100)
    };
    const quote = new Checkout({ rules: [loyalty] }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(receiptOf(quote)).toEqual(["Loyalty: 1.00 USD"]);
  });

  it("hands every rule the same pricing context, once per quote", () => {
    const first = new ContextSpy();
    const second = new ContextSpy();
    new Checkout({ rules: [first, second] }).quote({
      lines,
      shippingFee: SHIPPING
    });

    expect(first.seen).toHaveLength(1);
    expect(second.seen).toHaveLength(1);
    const [context] = first.seen;
    expect(context.lines.map(entry => entry.isbn)).toEqual(["isbn-a", "isbn-b"]);
    expect(show(context.subtotal)).toBe("50.00 USD");
    expect(show(context.shippingFee)).toBe("5.99 USD");
    expect(second.seen[0]).toEqual(context);
  });
});
