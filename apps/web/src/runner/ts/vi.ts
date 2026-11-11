import { createFakeTimers } from "@/runner/ts/fake-timers.ts";
import { fn, isMockFunction, mocks, spyOn } from "@vitest/spy";

type ModuleRecord = Record<string, unknown>;
type MockFactory = (importOriginal: () => Promise<ModuleRecord>) => ModuleRecord | Promise<ModuleRecord>;

export function createVi({ mockModule }: {
  mockModule: (input: {
    specifier: string;
    factory: MockFactory;
  }) => void;
}) {
  const timers = createFakeTimers();
  const stubbedGlobals = new Map<string, PropertyDescriptor | undefined>();
  const api = {
    ...timers,
    fn,
    spyOn,
    isMockFunction,
    mocked: <T>(item: T) => item,
    mock: (specifier: string, factory: MockFactory) => mockModule({
      specifier,
      factory
    }),
    doMock: (specifier: string, factory: MockFactory) => mockModule({
      specifier,
      factory
    }),
    clearAllMocks() {
      for (const spy of [...mocks].reverse()) {
        spy.mockClear();
      }
      return api;
    },
    resetAllMocks() {
      for (const spy of [...mocks].reverse()) {
        spy.mockReset();
      }
      return api;
    },
    restoreAllMocks() {
      for (const spy of [...mocks].reverse()) {
        spy.mockRestore();
      }
      return api;
    },
    stubGlobal(name: string, value: unknown) {
      if (!stubbedGlobals.has(name)) {
        stubbedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      }

      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: true
      });
      return api;
    },
    unstubAllGlobals() {
      for (const [name, descriptor] of stubbedGlobals) {
        if (descriptor) {
          Object.defineProperty(globalThis, name, descriptor);
        } else {
          Object.defineProperty(globalThis, name, {
            value: undefined,
            writable: true,
            configurable: true
          });
        }
      }
      stubbedGlobals.clear();
      return api;
    }
  };
  return api;
}
