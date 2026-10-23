import type { HashInput, UrlStore } from "../starter/shortener.ts";
import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

type Module = {
  encodeBase62: (id: number) => string;
  decodeBase62: (code: string) => number;
  sha256Hash: (input: HashInput) => number;
  shorten: (input: {
    longUrl: string;
    store: UrlStore;
    hash?: (input: HashInput) => number;
  }) => string;
};

const { encodeBase62, decodeBase62, shorten, sha256Hash } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "shortener.ts"
});

const CODE_LENGTH = 7;
const MAX_ATTEMPTS = 5;
const RUNAWAY_HASH_CALLS = 100;
const FIRST_COLLIDING_NUMBER = 1000;
const SECOND_NUMBER = 2000;
const SAMPLE_COUNT = 5000;
const URL_COUNT = 200;

function createFakeStore() {
  const entries = new Map<string, string>();
  return {
    entries,
    get: (code: string) => entries.get(code),
    setIfAbsent(code: string, longUrl: string) {
      if (entries.has(code)) {
        return false;
      }

      entries.set(code, longUrl);
      return true;
    }
  };
}

function createStoreWithBlindGet() {
  const store = createFakeStore();
  return {
    ...store,
    get: (_code: string) => undefined
  };
}

function scriptedHash(numbersByUrl: Record<string, number[]>) {
  const calls: HashInput[] = [];
  function hash({ longUrl, attempt }: HashInput) {
    calls.push({
      longUrl,
      attempt
    });

    if (calls.length > RUNAWAY_HASH_CALLS) {
      throw new Error("hash was called far too many times");
    }

    const numbers = numbersByUrl[longUrl];
    return numbers[Math.min(attempt, numbers.length - 1)];
  }
  return {
    hash,
    calls
  };
}

describe("encodeBase62 and decodeBase62", () => {
  it("writes zero as the first digit", () => {
    expect(encodeBase62(0)).toBe("0");
  });

  it("uses one character up to 61 and two characters from 62", () => {
    expect(encodeBase62(61)).toHaveLength(1);
    expect(encodeBase62(62)).toBe("10");
  });

  it("matches a known value: one billion is 15ftgG", () => {
    expect(encodeBase62(1_000_000_000)).toBe("15ftgG");
  });

  it("uses only digits and letters, so the code is safe inside a URL", () => {
    expect(encodeBase62(123_456_789)).toMatch(/^[0-9a-zA-Z]+$/);
  });

  it("gives every number its own code", () => {
    const codes = new Set(Array.from({ length: SAMPLE_COUNT }, (_, id) => encodeBase62(id)));
    expect(codes.size).toBe(SAMPLE_COUNT);
  });

  it("decodes back to the same number", () => {
    const ids = [0, 1, 61, 62, 63, 3843, 1_000_000_000, 62 ** CODE_LENGTH - 1, Number.MAX_SAFE_INTEGER];
    for (const id of ids) {
      expect(decodeBase62(encodeBase62(id))).toBe(id);
    }
  });
});

describe("shorten", () => {
  it("returns a code that resolves to the long URL", () => {
    const store = createFakeStore();
    const code = shorten({
      longUrl: "https://example.com/a",
      store
    });
    expect(store.get(code)).toBe("https://example.com/a");
  });

  it("returns the same code when the same URL is shortened twice, and stores it once", () => {
    const store = createFakeStore();
    const first = shorten({
      longUrl: "https://example.com/a",
      store
    });
    const second = shorten({
      longUrl: "https://example.com/a",
      store
    });
    expect(second).toBe(first);
    expect(store.entries.size).toBe(1);
  });

  it("gives different URLs different codes, and every code resolves back", () => {
    const store = createFakeStore();
    const urls = Array.from({ length: URL_COUNT }, (_, i) => `https://example.com/page/${i}`);
    const codes = urls.map(longUrl => shorten({
      longUrl,
      store
    }));
    expect(new Set(codes).size).toBe(URL_COUNT);
    for (const [i, code] of codes.entries()) {
      expect(store.get(code)).toBe(urls[i]);
    }
  });

  it("keeps the code within 7 characters, even for a huge hash", () => {
    const store = createFakeStore();
    const code = shorten({
      longUrl: "https://example.com/a",
      store,
      hash: () => Number.MAX_SAFE_INTEGER
    });
    expect(code.length).toBeLessThanOrEqual(CODE_LENGTH);
  });

  it("works with the real SHA-256 hash that comes with the file", () => {
    expect(
      sha256Hash({
        longUrl: "https://example.com/a",
        attempt: 0
      })
    ).not.toBe(
      sha256Hash({
        longUrl: "https://example.com/a",
        attempt: 1
      })
    );
  });

  describe("when two URLs collide", () => {
    const urlA = "https://example.com/a";
    const urlB = "https://example.com/b";

    it("never overwrites the first URL", () => {
      const store = createFakeStore();
      const { hash } = scriptedHash({
        [urlA]: [FIRST_COLLIDING_NUMBER],
        [urlB]: [FIRST_COLLIDING_NUMBER, SECOND_NUMBER]
      });
      const codeA = shorten({
        longUrl: urlA,
        store,
        hash
      });
      const codeB = shorten({
        longUrl: urlB,
        store,
        hash
      });
      expect(codeB).not.toBe(codeA);
      expect(store.get(codeA)).toBe(urlA);
      expect(store.get(codeB)).toBe(urlB);
    });

    it("retries with the next attempt number, starting from 0", () => {
      const store = createFakeStore();
      const { hash, calls } = scriptedHash({
        [urlA]: [FIRST_COLLIDING_NUMBER],
        [urlB]: [FIRST_COLLIDING_NUMBER, SECOND_NUMBER]
      });
      shorten({
        longUrl: urlA,
        store,
        hash
      });
      calls.length = 0;
      shorten({
        longUrl: urlB,
        store,
        hash
      });
      expect(calls.map(call => call.attempt)).toEqual([0, 1]);
    });

    it("keeps trying until it finds a free code", () => {
      const store = createFakeStore();
      for (const taken of [1, 2, 3]) {
        store.setIfAbsent(encodeBase62(taken), "https://other.example");
      }
      const { hash } = scriptedHash({ [urlA]: [1, 2, 3, 4] });
      expect(
        shorten({
          longUrl: urlA,
          store,
          hash
        })
      ).toBe(encodeBase62(4));
    });

    it("still returns the same code for a URL that was already stored after a collision", () => {
      const store = createFakeStore();
      const { hash } = scriptedHash({
        [urlA]: [FIRST_COLLIDING_NUMBER],
        [urlB]: [FIRST_COLLIDING_NUMBER, SECOND_NUMBER]
      });
      shorten({
        longUrl: urlA,
        store,
        hash
      });
      const first = shorten({
        longUrl: urlB,
        store,
        hash
      });
      const second = shorten({
        longUrl: urlB,
        store,
        hash
      });
      expect(second).toBe(first);
      expect(store.entries.size).toBe(2);
    });

    it("trusts the result of setIfAbsent, not a separate check that another server can beat", () => {
      const store = createStoreWithBlindGet();
      const { hash } = scriptedHash({
        [urlA]: [FIRST_COLLIDING_NUMBER],
        [urlB]: [FIRST_COLLIDING_NUMBER, SECOND_NUMBER]
      });
      shorten({
        longUrl: urlA,
        store,
        hash
      });
      const codeB = shorten({
        longUrl: urlB,
        store,
        hash
      });
      expect(store.entries.get(codeB)).toBe(urlB);
      expect(store.entries.get(encodeBase62(FIRST_COLLIDING_NUMBER))).toBe(urlA);
    });

    it("gives up after 5 attempts instead of looping forever", () => {
      const store = createFakeStore();
      store.setIfAbsent(encodeBase62(FIRST_COLLIDING_NUMBER), "https://other.example");
      const { hash, calls } = scriptedHash({ [urlA]: [FIRST_COLLIDING_NUMBER] });
      expect(() => shorten({
        longUrl: urlA,
        store,
        hash
      })).toThrow();
      expect(calls.length).toBe(MAX_ATTEMPTS);
    });
  });
});
