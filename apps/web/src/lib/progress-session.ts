import { markPassed, type Progress } from "#scripts/lib/progress-sync.ts";
import { passTimestamp, type ProgressStore, syncLocalIntoAccount } from "@/lib/progress-store.ts";

export const SyncState = {
  LOCAL: "local",
  SYNCING: "syncing",
  SYNCED: "synced",
  FAILED: "failed"
} as const;

export type SyncState = (typeof SyncState)[keyof typeof SyncState];

type Listener = () => void;

export class ProgressSession {
  #progress: Progress = {};
  #syncState: SyncState = SyncState.LOCAL;
  readonly #listeners = new Set<Listener>();
  readonly #local: ProgressStore;
  #account: ProgressStore | null = null;
  #generation = 0;

  constructor(local: ProgressStore) {
    this.#local = local;
  }

  get progress() {
    return this.#progress;
  }

  get syncState() {
    return this.#syncState;
  }

  subscribe(listener: Listener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async showLocal() {
    const generation = ++this.#generation;
    this.#account = null;
    const progress = await this.#local.load();
    if (generation !== this.#generation) {
      return;
    }

    this.#show({
      progress,
      syncState: SyncState.LOCAL
    });
  }

  async showAccount(account: ProgressStore) {
    const generation = ++this.#generation;
    this.#account = account;
    this.#show({
      progress: this.#progress,
      syncState: SyncState.SYNCING
    });
    try {
      const progress = await syncLocalIntoAccount({
        local: this.#local,
        account
      });
      await this.#local.save(progress);

      if (generation !== this.#generation) {
        return;
      }

      this.#show({
        progress,
        syncState: SyncState.SYNCED
      });
    } catch {
      if (generation !== this.#generation) {
        return;
      }

      this.#show({
        progress: await this.#local.load(),
        syncState: SyncState.FAILED
      });
    }
  }

  async recordPass(id: string) {
    const passedAt = passTimestamp();
    const passed = markPassed({
      progress: this.#progress,
      id,
      passedAt
    });
    const generation = this.#generation;
    const account = this.#account;
    this.#show({
      progress: passed,
      syncState: this.#syncState
    });

    if (!account) {
      await this.#local.save(passed);
      return;
    }

    try {
      const saved = await account.save(passed);
      await this.#local.save(saved);

      if (generation === this.#generation) {
        this.#show({
          progress: saved,
          syncState: SyncState.SYNCED
        });
      }
    } catch {
      await this.#keepOnDevice({
        id,
        passedAt
      });

      if (generation === this.#generation) {
        this.#show({
          progress: passed,
          syncState: SyncState.FAILED
        });
      }
    }
  }

  #show({ progress, syncState }: { progress: Progress; syncState: SyncState }) {
    this.#progress = progress;
    this.#syncState = syncState;
    for (const listener of this.#listeners) {
      listener();
    }
  }

  async #keepOnDevice({ id, passedAt }: { id: string; passedAt: string }) {
    const local = await this.#local.load();
    await this.#local.save(
      markPassed({
        progress: local,
        id,
        passedAt
      })
    );
  }
}
