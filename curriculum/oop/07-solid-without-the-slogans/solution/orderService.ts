import type { Order, OrderRequest, OrderServiceDependencies, PlaceOrderResult } from "./contracts.ts";

export const createOrderService = ({ validator, calculator, gateway, orders, receipts, newId }: OrderServiceDependencies) => ({
  placeOrder: async (request: OrderRequest): Promise<PlaceOrderResult> => {
    const problems = validator.validate(request);
    if (problems.length > 0) return { status: "rejected", problems };

    const { totalCents } = calculator.priceOf(request);
    const charge = await gateway.charge({ email: request.customerEmail, amountCents: totalCents });
    if (!charge.ok) return { status: "declined", reason: charge.reason };

    const order: Order = { id: newId(), customerEmail: request.customerEmail, lines: request.lines, totalCents };
    await orders.save(order);
    await receipts.send(order);
    return { status: "paid", order };
  }
});
