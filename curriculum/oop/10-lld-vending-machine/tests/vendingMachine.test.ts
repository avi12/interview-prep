import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createGate } from "#kit/async.ts";
import type { Dispenser, MachineOptions, Product, PurchaseRule, VendingMachine } from "../starter/contracts.ts";

type Module = { createVendingMachine: (options: MachineOptions) => VendingMachine };

const { createVendingMachine } = await loadImpl<Module>({ testUrl: import.meta.url, file: "vendingMachine.ts" });

const COINS = [5, 10, 25, 100];
const CHIPS_CENTS = 125;
const COLA_CENTS = 150;

const stockedProducts = (): Product[] => [
  { code: "A1", name: "Chips", priceCents: CHIPS_CENTS, stock: 3 },
  { code: "A2", name: "Cola", priceCents: COLA_CENTS, stock: 1 },
  { code: "B1", name: "Beer", priceCents: 300, stock: 1 },
  { code: "C1", name: "Gum", priceCents: 75, stock: 0 }
];

const setup = (overrides: Partial<MachineOptions> = {}) => {
  const dispensed: string[] = [];
  const dispenser: Dispenser = { dispense: async code => void dispensed.push(code) };
  const machine = createVendingMachine({ products: stockedProducts(), acceptedCoins: COINS, dispenser, ...overrides });
  const insertAll = (...coins: number[]) => {
    for (const coin of coins) machine.insertCoin(coin);
  };
  return { machine, dispensed, insertAll };
};

describe("idle", () => {
  it("starts idle, with no money, when something is in stock", () => {
    const { machine } = setup();

    expect(machine.stateName()).toBe("idle");
    expect(machine.balanceCents()).toBe(0);
  });

  it("refuses a selection until money is inserted", async () => {
    const { machine, dispensed } = setup();

    expect(await machine.select("A1")).toEqual({ ok: false, reason: "no-money" });
    expect(dispensed).toEqual([]);
  });

  it("cancel with no money refunds nothing and stays idle", () => {
    const { machine } = setup();

    expect(machine.cancel()).toEqual({ ok: true, refundCoins: [] });
    expect(machine.stateName()).toBe("idle");
  });

  it("a valid coin adds to the balance and moves to has-money", () => {
    const { machine } = setup();

    expect(machine.insertCoin(100)).toEqual({ ok: true, balanceCents: 100 });
    expect(machine.stateName()).toBe("hasMoney");
  });

  it("an unknown coin is rejected and nothing changes", () => {
    const { machine } = setup();

    expect(machine.insertCoin(50)).toEqual({ ok: false, reason: "invalid-coin" });
    expect(machine.balanceCents()).toBe(0);
    expect(machine.stateName()).toBe("idle");
  });
});

describe("has money", () => {
  it("adds up every coin", () => {
    const { machine, insertAll } = setup();
    insertAll(100, 25, 10);

    expect(machine.balanceCents()).toBe(135);
  });

  it("an invalid coin changes neither the balance nor the state", () => {
    const { machine, insertAll } = setup();
    insertAll(100);

    expect(machine.insertCoin(7)).toEqual({ ok: false, reason: "invalid-coin" });
    expect(machine.balanceCents()).toBe(100);
    expect(machine.stateName()).toBe("hasMoney");
  });

  it("not enough money keeps the money, and more coins complete the purchase", async () => {
    const { machine, insertAll } = setup();
    insertAll(100);

    expect(await machine.select("A1")).toEqual({ ok: false, reason: "insufficient-funds" });
    expect(machine.balanceCents()).toBe(100);
    expect(machine.stateName()).toBe("hasMoney");

    insertAll(25);
    expect(await machine.select("A1")).toEqual({ ok: true, code: "A1", changeCoins: [] });
  });

  it("an unknown product keeps the money", async () => {
    const { machine, insertAll } = setup();
    insertAll(100);

    expect(await machine.select("Z9")).toEqual({ ok: false, reason: "unknown-product" });
    expect(machine.balanceCents()).toBe(100);
  });

  it("a sold-out product keeps the money while other products are in stock", async () => {
    const { machine, insertAll } = setup();
    insertAll(100);

    expect(await machine.select("C1")).toEqual({ ok: false, reason: "product-sold-out" });
    expect(machine.balanceCents()).toBe(100);
    expect(machine.stateName()).toBe("hasMoney");
  });

  it("exact payment dispenses once, uses a unit of stock and returns to idle", async () => {
    const { machine, insertAll, dispensed } = setup();
    insertAll(100, 25);

    const result = await machine.select("A1");

    expect(result).toEqual({ ok: true, code: "A1", changeCoins: [] });
    expect(dispensed).toEqual(["A1"]);
    expect(machine.stockOf("A1")).toBe(2);
    expect(machine.balanceCents()).toBe(0);
    expect(machine.stateName()).toBe("idle");
  });

  it("overpaying returns change in the largest coins first", async () => {
    const { machine, insertAll } = setup();
    insertAll(100, 100);

    expect(await machine.select("A1")).toEqual({ ok: true, code: "A1", changeCoins: [25, 25, 25] });
  });

  it("cancel refunds the balance in the largest coins first and returns to idle", () => {
    const { machine, insertAll } = setup();
    insertAll(100, 25, 25, 10);

    expect(machine.cancel()).toEqual({ ok: true, refundCoins: [100, 25, 25, 10] });
    expect(machine.balanceCents()).toBe(0);
    expect(machine.stateName()).toBe("idle");
  });

  it("a jammed dispenser refunds everything, keeps the stock and returns to idle", async () => {
    const gate = createGate();
    const dispenser: Dispenser = { dispense: () => gate.promise };
    const { machine, insertAll } = setup({ dispenser });
    insertAll(100, 100);

    const pending = machine.select("A1");
    gate.fail("motor stuck");

    expect(await pending).toEqual({ ok: false, reason: "jammed", refundCoins: [100, 100] });
    expect(machine.stockOf("A1")).toBe(3);
    expect(machine.balanceCents()).toBe(0);
    expect(machine.stateName()).toBe("idle");
  });
});

describe("dispensing", () => {
  const startDispensing = () => {
    const gate = createGate();
    const dispenser: Dispenser = { dispense: () => gate.promise };
    const context = setup({ dispenser });
    context.insertAll(100, 100);
    const pending = context.machine.select("A1");
    return { ...context, gate, pending };
  };

  it("is in the dispensing state as soon as select is called", () => {
    const { machine } = startDispensing();

    expect(machine.stateName()).toBe("dispensing");
  });

  it("rejects coins, selections and cancel while busy", async () => {
    const { machine } = startDispensing();

    expect(machine.insertCoin(25)).toEqual({ ok: false, reason: "busy" });
    expect(await machine.select("A2")).toEqual({ ok: false, reason: "busy" });
    expect(machine.cancel()).toEqual({ ok: false, reason: "busy" });
  });

  it("the rejected coin never reaches the balance", async () => {
    const { machine, gate, pending } = startDispensing();
    machine.insertCoin(25);
    gate.release();

    expect(await pending).toEqual({ ok: true, code: "A1", changeCoins: [25, 25, 25] });
  });

  it("goes back to idle once the product is out", async () => {
    const { machine, gate, pending } = startDispensing();
    gate.release();
    await pending;

    expect(machine.stateName()).toBe("idle");
  });
});

describe("out of stock", () => {
  const singleItemMachine = () =>
    setup({ products: [{ code: "A1", name: "Chips", priceCents: CHIPS_CENTS, stock: 1 }] });

  it("selling the last item moves the machine to out-of-stock", async () => {
    const { machine, insertAll } = singleItemMachine();
    insertAll(100, 25);

    await machine.select("A1");

    expect(machine.stateName()).toBe("outOfStock");
  });

  it("refuses coins, and the coin is not kept", async () => {
    const { machine, insertAll } = singleItemMachine();
    insertAll(100, 25);
    await machine.select("A1");

    expect(machine.insertCoin(25)).toEqual({ ok: false, reason: "sold-out" });
    expect(machine.balanceCents()).toBe(0);
  });

  it("refuses selections and cancel has nothing to refund", async () => {
    const { machine, insertAll } = singleItemMachine();
    insertAll(100, 25);
    await machine.select("A1");

    expect(await machine.select("A1")).toEqual({ ok: false, reason: "sold-out" });
    expect(machine.cancel()).toEqual({ ok: true, refundCoins: [] });
  });

  it("restocking brings it back to idle, ready for coins", async () => {
    const { machine, insertAll } = singleItemMachine();
    insertAll(100, 25);
    await machine.select("A1");

    machine.restock({ code: "A1", quantity: 2 });

    expect(machine.stateName()).toBe("idle");
    expect(machine.stockOf("A1")).toBe(2);
    expect(machine.insertCoin(100)).toEqual({ ok: true, balanceCents: 100 });
  });

  it("a machine created with no stock at all starts out-of-stock", () => {
    const { machine } = setup({ products: [{ code: "A1", name: "Chips", priceCents: CHIPS_CENTS, stock: 0 }] });

    expect(machine.stateName()).toBe("outOfStock");
  });

  it("restocking while stock remains does not disturb a customer who is paying", () => {
    const { machine, insertAll } = setup();
    insertAll(100);

    machine.restock({ code: "A1", quantity: 5 });

    expect(machine.stateName()).toBe("hasMoney");
    expect(machine.balanceCents()).toBe(100);
  });
});

describe("independence", () => {
  it("does not change the product list it was given", async () => {
    const products = stockedProducts();
    const { machine, insertAll } = setup({ products });
    insertAll(100, 25);
    await machine.select("A1");

    expect(products[0].stock).toBe(3);
  });

  it("two machines never share balance or stock", () => {
    const first = setup();
    const second = setup();
    first.insertAll(100);

    expect(second.machine.balanceCents()).toBe(0);
    expect(second.machine.stateName()).toBe("idle");
  });
});

describe("extension: new coins and new product rules plug in without editing your code", () => {
  it("a 50 cent coin is accepted only when configured, and then is used for change", async () => {
    const withoutFifty = setup();
    const withFifty = setup({ acceptedCoins: [5, 10, 25, 50, 100] });

    expect(withoutFifty.machine.insertCoin(50)).toEqual({ ok: false, reason: "invalid-coin" });
    expect(withFifty.machine.insertCoin(50)).toEqual({ ok: true, balanceCents: 50 });

    withoutFifty.insertAll(100, 100);
    withFifty.machine.cancel();
    withFifty.insertAll(100, 100);
    expect(await withoutFifty.machine.select("A2")).toEqual({ ok: true, code: "A2", changeCoins: [25, 25] });
    expect(await withFifty.machine.select("A2")).toEqual({ ok: true, code: "A2", changeCoins: [50] });
  });

  it("a product rule written in the test can refuse a purchase and keep the money", async () => {
    const idRequired: PurchaseRule = ({ product }) => (product.name === "Beer" ? "ID required" : undefined);
    const { machine, insertAll, dispensed } = setup({ rules: [idRequired] });
    insertAll(100, 100, 100);

    expect(await machine.select("B1")).toEqual({ ok: false, reason: "rule-rejected", detail: "ID required" });
    expect(dispensed).toEqual([]);
    expect(machine.balanceCents()).toBe(300);
    expect(machine.stateName()).toBe("hasMoney");
  });

  it("the same rule does not get in the way of other products", async () => {
    const idRequired: PurchaseRule = ({ product }) => (product.name === "Beer" ? "ID required" : undefined);
    const { machine, insertAll } = setup({ rules: [idRequired] });
    insertAll(100, 100);

    expect(await machine.select("A1")).toMatchObject({ ok: true, code: "A1" });
  });

  it("a rule sees the balance, and the first rule that refuses decides", async () => {
    const balances: number[] = [];
    const watcher: PurchaseRule = ({ balanceCents }) => void balances.push(balanceCents);
    const minimumBalance: PurchaseRule = ({ balanceCents }) => (balanceCents < 200 ? "minimum one 2 dollar balance" : undefined);
    const neverReached: PurchaseRule = () => "second refusal";
    const { machine, insertAll } = setup({ rules: [watcher, minimumBalance, neverReached] });
    insertAll(100, 25);

    expect(await machine.select("A1")).toEqual({ ok: false, reason: "rule-rejected", detail: "minimum one 2 dollar balance" });
    expect(balances).toEqual([125]);
  });
});
