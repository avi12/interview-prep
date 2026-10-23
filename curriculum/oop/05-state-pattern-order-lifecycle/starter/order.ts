import type { Money } from "#kit/bookstore/money.ts";
import type { OrderState } from "./orderTypes.ts";

export class Order {
  readonly id: string;
  readonly total: Money;

  constructor({ id, total }: { id: string; total: Money; state?: OrderState }) {
    this.id = id;
    this.total = total;
  }

  get status(): string {
    throw new Error("not implemented");
  }

  get refunded(): Money {
    throw new Error("not implemented");
  }

  pay() {
    throw new Error("not implemented");
  }

  ship() {
    throw new Error("not implemented");
  }

  deliver() {
    throw new Error("not implemented");
  }

  cancel() {
    throw new Error("not implemented");
  }
}
