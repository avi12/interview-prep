import type { Money } from "./money.ts";

export const OrderStatus = {
  placed: "placed",
  paid: "paid",
  shipped: "shipped",
  cancelled: "cancelled"
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderAction = {
  pay: "pay",
  ship: "ship",
  cancel: "cancel"
} as const;
export type OrderAction = (typeof OrderAction)[keyof typeof OrderAction];

export type OrderLine = {
  title: string;
  unitPrice: Money;
  quantity: number;
};

export type DiscountRule = {
  name: string;
  discountFor: (lines: readonly OrderLine[]) => Money;
};

export type ChargeResult = {
  ok: true;
  receiptId: string;
} | {
  ok: false;
  reason: string;
};

export type PaymentGateway = {
  charge: (input: {
    orderId: string;
    amount: Money;
  }) => Promise<ChargeResult>;
  refund: (input: {
    orderId: string;
    receiptId: string;
    amount: Money;
  }) => Promise<void>;
};

export type CheckoutEvent =
  | {
    type: "OrderPlaced";
    orderId: string;
    total: Money;
  }
  | {
    type: "OrderPaid";
    orderId: string;
    receiptId: string;
  }
  | {
    type: "PaymentDeclined";
    orderId: string;
    reason: string;
  }
  | {
    type: "OrderShipped";
    orderId: string;
  }
  | {
    type: "OrderCancelled";
    orderId: string;
    wasRefunded: boolean;
  };

export type CheckoutListener = (event: CheckoutEvent) => void | Promise<void>;

export type EventBus = {
  subscribe: (listener: CheckoutListener) => () => void;
  publish: (event: CheckoutEvent) => void;
};

export type Transition = {
  to: OrderStatus;
  refunds: boolean;
};

export type CheckoutOptions = {
  gateway: PaymentGateway;
  rules?: DiscountRule[];
  newId: () => string;
  reportError?: (error: unknown) => void;
};

export type OrderView = {
  id: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: Money;
  discount: Money;
  total: Money;
};

export type PayResult =
  | {
    outcome: "paid";
    order: OrderView;
  }
  | {
    outcome: "declined";
    reason: string;
    order: OrderView;
  };

export type Checkout = {
  placeOrder: (input: { lines: OrderLine[] }) => OrderView;
  getOrder: (orderId: string) => OrderView;
  pay: (orderId: string) => Promise<PayResult>;
  ship: (orderId: string) => Promise<OrderView>;
  cancel: (orderId: string) => Promise<OrderView>;
  on: (listener: CheckoutListener) => () => void;
};
