export const ErrorCode = {
  emptyOrder: "empty-order",
  invalidLine: "invalid-line",
  unknownOrder: "unknown-order",
  invalidTransition: "invalid-transition"
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class CheckoutError extends Error {
  readonly code: ErrorCode;

  constructor({ code, message }: {
    code: ErrorCode;
    message: string;
  }) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
  }
}
