import { describe, expect, it, vi } from "vitest";

import {
  AUTO_RELOAD_COOLDOWN_MS,
  AUTO_RELOAD_MAX_COUNT,
  AUTO_RELOAD_TIMES_KEY,
  AUTO_RELOAD_WINDOW_MS,
  reloadForUpdate
} from "@/lib/reload.ts";
import { BrokenStorage, MemoryStorage } from "@/test/memory-storage.ts";

const NOW = 1_000_000_000;

function storageWith(times: number[]) {
  const storage = new MemoryStorage();
  storage.setItem(AUTO_RELOAD_TIMES_KEY, JSON.stringify(times));
  return storage;
}

describe("reloadForUpdate", () => {
  it("reloads and records the time", () => {
    const storage = new MemoryStorage();
    const reload = vi.fn();
    expect(
      reloadForUpdate({
        storage,
        now: NOW,
        reload
      })
    ).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.getItem(AUTO_RELOAD_TIMES_KEY) ?? "")).toEqual([NOW]);
  });

  it("waits out the cooldown after a reload", () => {
    const reload = vi.fn();
    expect(
      reloadForUpdate({
        storage: storageWith([NOW - AUTO_RELOAD_COOLDOWN_MS + 1]),
        now: NOW,
        reload
      })
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("stops after the reload limit inside the window", () => {
    const oldestAllowed = NOW - AUTO_RELOAD_COOLDOWN_MS - 1;
    const times = Array.from({ length: AUTO_RELOAD_MAX_COUNT }, (_, iTime) => oldestAllowed - iTime);
    const reload = vi.fn();
    expect(
      reloadForUpdate({
        storage: storageWith(times),
        now: NOW,
        reload
      })
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("forgets reloads older than the window", () => {
    const times = Array.from({ length: AUTO_RELOAD_MAX_COUNT }, () => NOW - AUTO_RELOAD_WINDOW_MS);
    const storage = storageWith(times);
    const reload = vi.fn();
    expect(
      reloadForUpdate({
        storage,
        now: NOW,
        reload
      })
    ).toBe(true);
    expect(JSON.parse(storage.getItem(AUTO_RELOAD_TIMES_KEY) ?? "")).toEqual([NOW]);
  });

  it("still reloads when storage is unavailable", () => {
    const reload = vi.fn();
    expect(
      reloadForUpdate({
        storage: new BrokenStorage(),
        now: NOW,
        reload
      })
    ).toBe(true);
  });
});
