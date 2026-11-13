import { describe, expect, it, vi } from "vitest";

import { mergeProgress, type Progress } from "#scripts/lib/progress-sync.ts";
import { ProgressSession, SyncState } from "@/lib/progress-session.ts";
import { createLocalProgressStore, type ProgressStore } from "@/lib/progress-store.ts";
import { MemoryStorage } from "@/test/memory-storage.ts";

const LESSON_ID = "foundations/01-two-sum";
const OTHER_ID = "sql/01-select";
const PASSED_AT = "2026-11-01T10:00:00.000Z";

function accountStore(initial: Progress) {
  let current = initial;
  return {
    load: async () => current,
    async save(progress) {
      current = mergeProgress({
        left: current,
        right: progress
      });
      return current;
    }
  } satisfies ProgressStore;
}

function failingStore() {
  return {
    async load() {
      throw new Error("offline");
    },
    async save() {
      throw new Error("offline");
    }
  };
}

describe("progress session", () => {
  it("keeps a pass on the device while signed out and tells every listener", async () => {
    const local = createLocalProgressStore(new MemoryStorage());
    const session = new ProgressSession(local);
    const listener = vi.fn();
    session.subscribe(listener);

    await session.recordPass(LESSON_ID);

    expect(session.progress[LESSON_ID]?.passedAt).not.toBeNull();
    expect(session.syncState).toBe(SyncState.LOCAL);
    expect((await local.load())[LESSON_ID]).toEqual(session.progress[LESSON_ID]);
    expect(listener).toHaveBeenCalled();
  });

  it("merges the device's progress into the account on sign-in", async () => {
    const local = createLocalProgressStore(new MemoryStorage());
    await local.save({
      [LESSON_ID]: {
        attempts: 1,
        passedAt: PASSED_AT
      }
    });
    const session = new ProgressSession(local);

    await session.showAccount(
      accountStore({
        [OTHER_ID]: {
          attempts: 1,
          passedAt: PASSED_AT
        }
      })
    );

    expect(session.syncState).toBe(SyncState.SYNCED);
    expect(Object.keys(session.progress).toSorted()).toEqual([LESSON_ID, OTHER_ID]);
  });

  it("falls back to the device and says so when the account cannot be reached", async () => {
    const session = new ProgressSession(createLocalProgressStore(new MemoryStorage()));

    await session.showAccount(failingStore());
    await session.recordPass(LESSON_ID);

    expect(session.syncState).toBe(SyncState.FAILED);
    expect(session.progress[LESSON_ID]?.passedAt).not.toBeNull();
  });

  it("stops telling a listener once it unsubscribes", async () => {
    const session = new ProgressSession(createLocalProgressStore(new MemoryStorage()));
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    unsubscribe();

    await session.showLocal();

    expect(listener).not.toHaveBeenCalled();
  });
});
