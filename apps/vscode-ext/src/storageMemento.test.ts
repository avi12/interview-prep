import { type KeyValueStorage, StorageMemento } from "@/storageMemento.ts";
import { describe, expect, it } from "vitest";

const STORAGE_KEY = "interviewPrep.globalState";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    storage: {
      getItem: key => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value)
    } satisfies KeyValueStorage
  };
}

describe("StorageMemento", () => {
  it("returns the default for a key it has not stored", () => {
    const memento = new StorageMemento({
      ...memoryStorage(),
      storageKey: STORAGE_KEY
    });
    expect(memento.get("view", "path")).toBe("path");
    expect(memento.get("view")).toBeUndefined();
  });

  it("keeps values across instances on the same storage", async () => {
    const { storage } = memoryStorage();
    await new StorageMemento({
      storage,
      storageKey: STORAGE_KEY
    }).update("onboarded", true);

    const reopened = new StorageMemento({
      storage,
      storageKey: STORAGE_KEY
    });
    expect(reopened.get("onboarded", false)).toBe(true);
    expect(reopened.keys()).toEqual(["onboarded"]);
  });

  it("forgets a key updated to undefined", async () => {
    const memento = new StorageMemento({
      ...memoryStorage(),
      storageKey: STORAGE_KEY
    });
    await memento.update("lesson", "foundations/01-two-sum");
    await memento.update("lesson", undefined);
    expect(memento.keys()).toEqual([]);
  });

  it("starts empty when the stored value is corrupt", () => {
    const { storage, items } = memoryStorage();
    items.set(STORAGE_KEY, "{not json");
    const memento = new StorageMemento({
      storage,
      storageKey: STORAGE_KEY
    });
    expect(memento.keys()).toEqual([]);
  });
});
