import { parseJson } from "@scripts/lib/json.ts";
import { zod } from "@scripts/lib/zod.ts";
import type * as vscode from "vscode";

export interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const valuesSchema = zod.record(zod.string(), zod.unknown());

export class StorageMemento implements vscode.Memento {
  private readonly storage: KeyValueStorage;
  private readonly storageKey: string;

  constructor({ storage, storageKey }: { storage: KeyValueStorage; storageKey: string }) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  keys() {
    return Object.keys(this.values());
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T) {
    const values = this.values();
    return key in values ? values[key] : defaultValue;
  }

  async update(key: string, value: unknown) {
    const values = this.values();
    if (value === undefined) {
      delete values[key];
    } else {
      values[key] = value;
    }

    this.storage.setItem(this.storageKey, JSON.stringify(values));
  }

  setKeysForSync() {
    return undefined;
  }

  private values() {
    return parseJson({
      text: this.storage.getItem(this.storageKey),
      schema: valuesSchema,
      fallback: {}
    });
  }
}
