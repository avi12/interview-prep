import { type FakeMethod, withGlobal } from "@sinonjs/fake-timers";

const NOT_FAKED = new Set<string>(["nextTick", "queueMicrotask"]);
const NOT_MOCKED_MESSAGE = 'Timers are not mocked. Try calling "vi.useFakeTimers()" first.';

type Clock = ReturnType<ReturnType<typeof withGlobal>["install"]>;

export function createFakeTimers() {
  const fakeTimers = withGlobal(globalThis);
  let clock: Clock | undefined;

  function isFakeMethod(name: string): name is FakeMethod {
    return Object.hasOwn(fakeTimers.timers, name);
  }

  function installed() {
    if (!clock) {
      throw new Error(NOT_MOCKED_MESSAGE);
    }

    return clock;
  }

  return {
    useFakeTimers(
      config: {
        toFake?: FakeMethod[];
        now?: number | Date;
      } = {}
    ) {
      if (clock) {
        return;
      }

      const toFake = Object.keys(fakeTimers.timers)
        .filter(isFakeMethod)
        .filter(timer => !NOT_FAKED.has(timer));
      clock = fakeTimers.install({
        now: Date.now(),
        ...config,
        toFake: config.toFake ?? toFake,
        ignoreMissingTimers: true
      });
    },
    useRealTimers() {
      clock?.uninstall();
      clock = undefined;
    },
    isFakeTimers: () => clock !== undefined,
    advanceTimersByTime: (milliseconds: number) => installed().tick(milliseconds),
    advanceTimersByTimeAsync: async (milliseconds: number) => installed().tickAsync(milliseconds),
    advanceTimersToNextTimer: () => installed().next(),
    advanceTimersToNextTimerAsync: async () => installed().nextAsync(),
    runAllTimers: () => installed().runAll(),
    runAllTimersAsync: async () => installed().runAllAsync(),
    runOnlyPendingTimers: () => installed().runToLast(),
    runOnlyPendingTimersAsync: async () => installed().runToLastAsync(),
    getTimerCount: () => installed().countTimers(),
    clearAllTimers: () => clock?.reset(),
    setSystemTime: (now: number | string | Date) => installed().setSystemTime(new Date(now)),
    getMockedSystemTime: () => (clock ? new Date(clock.now) : null)
  };
}
