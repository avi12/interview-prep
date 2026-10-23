export type OrderLine = {
  sku: string;
  unitPriceCents: number;
  quantity: number;
};

export type OrderRequest = {
  customerEmail: string;
  lines: OrderLine[];
  couponCode?: string;
};

export type Price = {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
};

export type Order = {
  id: string;
  customerEmail: string;
  lines: OrderLine[];
  totalCents: number;
};

export type ChargeResult = { ok: true } | {
  ok: false;
  reason: string;
};

export type PlaceOrderResult =
  | {
    status: "paid";
    order: Order;
  }
  | {
    status: "rejected";
    problems: string[];
  }
  | {
    status: "declined";
    reason: string;
  };

export type OrderValidator = { validate: (request: OrderRequest) => string[] };

export type PricingRule = {
  name: string;
  discountCents: (request: OrderRequest) => number;
};

export type PriceCalculator = { priceOf: (request: OrderRequest) => Price };

export type PaymentGateway = { charge: (input: {
  email: string;
  amountCents: number;
}) => Promise<ChargeResult>; };

export type OrderSaver = { save: (order: Order) => Promise<void> };

export type ReceiptSender = { send: (order: Order) => Promise<void> };

export type OrderServiceDependencies = {
  validator: OrderValidator;
  calculator: PriceCalculator;
  gateway: PaymentGateway;
  orders: OrderSaver;
  receipts: ReceiptSender;
  newId: () => string;
};
