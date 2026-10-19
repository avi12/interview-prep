import { vi } from "vitest";

type NodeCrypto = typeof import("node:crypto");

export type GetRandomBytes = (size: number) => Buffer;

export const withSpiedTimingSafeEqual = (actual: NodeCrypto) => {
  const timingSafeEqual = vi.fn(actual.timingSafeEqual);
  return { ...actual, timingSafeEqual, default: { ...actual, timingSafeEqual } };
};
