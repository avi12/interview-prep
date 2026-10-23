import { OrderAction, OrderStatus, refuse } from "./orderTypes.ts";
import type { OrderContext, OrderState } from "./orderTypes.ts";

export class PendingState implements OrderState {
  readonly name = OrderStatus.pending;

  pay(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.pay
    });
  }

  ship(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.ship
    });
  }

  deliver(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.deliver
    });
  }

  cancel(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.cancel
    });
  }
}

export class PaidState implements OrderState {
  readonly name = OrderStatus.paid;

  pay(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.pay
    });
  }

  ship(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.ship
    });
  }

  deliver(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.deliver
    });
  }

  cancel(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.cancel
    });
  }
}

export class ShippedState implements OrderState {
  readonly name = OrderStatus.shipped;

  pay(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.pay
    });
  }

  ship(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.ship
    });
  }

  deliver(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.deliver
    });
  }

  cancel(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.cancel
    });
  }
}

export class DeliveredState implements OrderState {
  readonly name = OrderStatus.delivered;

  pay(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.pay
    });
  }

  ship(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.ship
    });
  }

  deliver(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.deliver
    });
  }

  cancel(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.cancel
    });
  }
}

export class CancelledState implements OrderState {
  readonly name = OrderStatus.cancelled;

  pay(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.pay
    });
  }

  ship(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.ship
    });
  }

  deliver(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.deliver
    });
  }

  cancel(_order: OrderContext) {
    refuse({
      from: this.name,
      action: OrderAction.cancel
    });
  }
}
