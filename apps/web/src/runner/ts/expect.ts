import {
  ASYMMETRIC_MATCHERS_OBJECT,
  type ExpectStatic,
  getState,
  GLOBAL_EXPECT,
  JestAsymmetricMatchers,
  JestChaiExpect,
  JestExtend,
  setState
} from "@vitest/expect";
import { getCurrentTest } from "@vitest/runner";
import * as chai from "chai";

chai.use(JestExtend);
chai.use(JestChaiExpect);
chai.use(JestAsymmetricMatchers);

function isExpectStatic(value: unknown): value is ExpectStatic {
  return typeof value === "function";
}

function asymmetricMatchers() {
  const matchers: unknown = Object.getOwnPropertyDescriptor(globalThis, ASYMMETRIC_MATCHERS_OBJECT)?.value;
  return typeof matchers === "object" ? matchers : {};
}

export function createExpect() {
  function expectValue(value: unknown, message?: string) {
    const { assertionCalls } = getState(expect);
    setState({ assertionCalls: assertionCalls + 1 }, expect);
    const assertion = chai.expect(value, message);
    const test = getCurrentTest();
    if (!test) {
      return assertion;
    }

    if ("withTest" in assertion && typeof assertion.withTest === "function") {
      return assertion.withTest(test);
    }

    return assertion;
  }

  Object.assign(expectValue, chai.expect, asymmetricMatchers(), {
    getState: () => getState(expect),
    setState: (state: Parameters<typeof setState>[0]) => setState(state, expect),
    extend(matchers: object) {
      if ("extend" in chai.expect && typeof chai.expect.extend === "function") {
        chai.expect.extend(expect, matchers);
      }
    },
    unreachable: (message?: string) => chai.assert.fail(`expected${message ? ` "${message}" ` : " "}not to be reached`),
    soft: (value: unknown, message?: string) => expectValue(value, message)
  });
  const candidate: unknown = expectValue;
  if (!isExpectStatic(candidate)) {
    throw new Error("expect could not be created");
  }

  const expect = candidate;
  setState(
    {
      assertionCalls: 0,
      isExpectingAssertions: false,
      isExpectingAssertionsError: null,
      expectedAssertionsNumber: null,
      expectedAssertionsNumberErrorGen: null
    },
    expect
  );
  Object.assign(globalThis, { [GLOBAL_EXPECT]: expect });
  return expect;
}

export { chai };
