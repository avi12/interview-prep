import type * as nodeCrypto from "node:crypto";

import { vi } from "vitest";

type NodeCrypto = typeof nodeCrypto;

export type GetRandomBytes = (size: number) => Buffer;

export function withSpiedTimingSafeEqual(actual: NodeCrypto) {
  const timingSafeEqual = vi.fn(actual.timingSafeEqual);
  return {
    ...actual,
    timingSafeEqual,
    default: {
      ...actual,
      timingSafeEqual
    }
  };
}
