import { Reason, StateName } from "./contracts.ts";
import type { CancelResult, InsertResult, MachineOptions, Product, SelectResult, VendingMachine } from "./contracts.ts";

type MachineState = {
  name: StateName;
  insertCoin: (coinCents: number) => InsertResult;
  select: (code: string) => Promise<SelectResult>;
  cancel: () => CancelResult;
};

const reject = (reason: Reason) => ({ ok: false as const, reason });

export const createVendingMachine = ({ products, acceptedCoins, dispenser, rules = [] }: MachineOptions): VendingMachine => {
  const stock = new Map(products.map(product => [product.code, { ...product }]));
  const coinsLargestFirst = acceptedCoins.filter(coin => coin > 0).sort((a, b) => b - a);
  let balanceCents = 0;

  const hasAnyStock = () => [...stock.values()].some(product => product.stock > 0);

  const coinsFor = (amountCents: number) => {
    const coins: number[] = [];
    let remainingCents = amountCents;
    for (const coin of coinsLargestFirst) {
      const count = Math.floor(remainingCents / coin);
      coins.push(...Array<number>(count).fill(coin));
      remainingCents -= count * coin;
    }
    return coins;
  };

  const takeBalanceAsCoins = () => {
    const coins = coinsFor(balanceCents);
    balanceCents = 0;
    return coins;
  };

  const addCoin = (coinCents: number): InsertResult => {
    if (!acceptedCoins.includes(coinCents)) return reject(Reason.invalidCoin);
    balanceCents += coinCents;
    state = hasMoney;
    return { ok: true, balanceCents };
  };

  const dispense = async (product: Product): Promise<SelectResult> => {
    state = dispensing;
    try {
      await dispenser.dispense(product.code);
    } catch {
      state = idle;
      return { ...reject(Reason.jammed), refundCoins: takeBalanceAsCoins() };
    }
    product.stock -= 1;
    const changeCoins = coinsFor(balanceCents - product.priceCents);
    balanceCents = 0;
    state = hasAnyStock() ? idle : outOfStock;
    return { ok: true, code: product.code, changeCoins };
  };

  const idle: MachineState = {
    name: StateName.idle,
    insertCoin: addCoin,
    select: async () => reject(Reason.noMoney),
    cancel: () => ({ ok: true, refundCoins: [] })
  };

  const hasMoney: MachineState = {
    name: StateName.hasMoney,
    insertCoin: addCoin,
    select: async code => {
      const product = stock.get(code);
      if (!product) return reject(Reason.unknownProduct);
      if (product.stock === 0) return reject(Reason.productSoldOut);
      for (const rule of rules) {
        const detail = rule({ product: { ...product }, balanceCents });
        if (detail) return { ...reject(Reason.ruleRejected), detail };
      }
      if (balanceCents < product.priceCents) return reject(Reason.insufficientFunds);
      return dispense(product);
    },
    cancel: () => {
      const refundCoins = takeBalanceAsCoins();
      state = idle;
      return { ok: true, refundCoins };
    }
  };

  const dispensing: MachineState = {
    name: StateName.dispensing,
    insertCoin: () => reject(Reason.busy),
    select: async () => reject(Reason.busy),
    cancel: () => reject(Reason.busy)
  };

  const outOfStock: MachineState = {
    name: StateName.outOfStock,
    insertCoin: () => reject(Reason.soldOut),
    select: async () => reject(Reason.soldOut),
    cancel: () => ({ ok: true, refundCoins: [] })
  };

  let state: MachineState = hasAnyStock() ? idle : outOfStock;

  return {
    insertCoin: coinCents => state.insertCoin(coinCents),
    select: code => state.select(code),
    cancel: () => state.cancel(),
    restock: ({ code, quantity }) => {
      const product = stock.get(code);
      if (!product) throw new Error(`unknown product ${code}`);
      product.stock += quantity;
      if (state === outOfStock && hasAnyStock()) state = idle;
    },
    stateName: () => state.name,
    balanceCents: () => balanceCents,
    stockOf: code => stock.get(code)?.stock ?? 0
  };
};
