export const Reason = {
  invalidCoin: "invalid-coin",
  busy: "busy",
  soldOut: "sold-out",
  noMoney: "no-money",
  unknownProduct: "unknown-product",
  productSoldOut: "product-sold-out",
  insufficientFunds: "insufficient-funds",
  ruleRejected: "rule-rejected",
  jammed: "jammed"
} as const;
export type Reason = (typeof Reason)[keyof typeof Reason];

export const StateName = {
  idle: "idle",
  hasMoney: "hasMoney",
  dispensing: "dispensing",
  outOfStock: "outOfStock"
} as const;
export type StateName = (typeof StateName)[keyof typeof StateName];

export type Product = { code: string; name: string; priceCents: number; stock: number };

export type Dispenser = { dispense: (code: string) => Promise<void> };

export type PurchaseRule = (input: { product: Product; balanceCents: number }) => string | undefined;

export type MachineOptions = {
  products: Product[];
  acceptedCoins: number[];
  dispenser: Dispenser;
  rules?: PurchaseRule[];
};

export type InsertResult = { ok: true; balanceCents: number } | { ok: false; reason: Reason };

export type SelectResult =
  | { ok: true; code: string; changeCoins: number[] }
  | { ok: false; reason: Reason; detail?: string; refundCoins?: number[] };

export type CancelResult = { ok: true; refundCoins: number[] } | { ok: false; reason: Reason };

export type VendingMachine = {
  insertCoin: (coinCents: number) => InsertResult;
  select: (code: string) => Promise<SelectResult>;
  cancel: () => CancelResult;
  restock: (input: { code: string; quantity: number }) => void;
  stateName: () => StateName;
  balanceCents: () => number;
  stockOf: (code: string) => number;
};
