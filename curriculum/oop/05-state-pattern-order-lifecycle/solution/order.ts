import { Money } from "#kit/bookstore/money.ts";
import type { OrderContext, OrderState } from "./orderTypes.ts";
import { PendingState } from "./states.ts";

export class Order {
  readonly id: string;
  readonly total: Money;
  #state: OrderState;
  #refunded: Money;
  readonly #context: OrderContext;

  constructor({ id, total, state = new PendingState() }: { id: string; total: Money; state?: OrderState }) {
    this.id = id;
    this.total = total;
    this.#state = state;
    this.#refunded = Money.zero(total.currency);
    this.#context = {
      total,
      moveTo: next => {
        this.#state = next;
      },
      refund: amount => {
        this.#refunded = this.#refunded.add(amount);
      }
    };
  }

  get status() {
    return this.#state.name;
  }

  get refunded() {
    return this.#refunded;
  }

  pay() {
    this.#state.pay(this.#context);
  }

  ship() {
    this.#state.ship(this.#context);
  }

  deliver() {
    this.#state.deliver(this.#context);
  }

  cancel() {
    this.#state.cancel(this.#context);
  }
}
