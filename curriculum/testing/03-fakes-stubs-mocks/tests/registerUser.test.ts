import { describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { sequentialIds } from "#kit/ids.ts";
import type * as ServiceModule from "../starter/registerUser.ts";
import type * as FakeModule from "../starter/fakeUserRepository.ts";

const { createRegisterUser, RegistrationError } = await loadImpl<typeof ServiceModule>({ testUrl: import.meta.url, file: "registerUser.ts" });
const { createInMemoryUserRepository } = await loadImpl<typeof FakeModule>({ testUrl: import.meta.url, file: "fakeUserRepository.ts" });

const VALID_PASSWORD = "correct-horse";
const ANA = { id: "id-1", email: "ana@example.com", passwordHash: "hash-1" };
const BEN = { id: "id-2", email: "ben@example.com", passwordHash: "hash-2" };

const stubHash = (password: string) => `hashed:${password}`;

const setup = () => {
  const users = createInMemoryUserRepository();
  const mailer = { sendWelcome: vi.fn(async (_email: string) => {}) };
  const registerUser = createRegisterUser({ users, mailer, hashPassword: stubHash, newId: sequentialIds("user") });
  return { users, mailer, registerUser };
};

describe("your fake repository behaves like a real one", () => {
  it("finds nothing for an email that was never saved", async () => {
    const users = createInMemoryUserRepository();

    expect(await users.findByEmail("nobody@example.com")).toBeUndefined();
  });

  it("finds a user after it was saved", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);

    expect(await users.findByEmail(ANA.email)).toEqual(ANA);
  });

  it("keeps several users apart", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);
    await users.save(BEN);

    expect(await users.findByEmail(BEN.email)).toEqual(BEN);
    expect(await users.list()).toEqual([ANA, BEN]);
  });

  it("replaces a user saved again with the same id", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);
    await users.save({ ...ANA, email: "ana.new@example.com" });

    expect(await users.findByEmail(ANA.email)).toBeUndefined();
    expect(await users.list()).toHaveLength(1);
  });

  it("hands out copies, so changing a result does not change the store", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);
    const found = await users.findByEmail(ANA.email);
    if (found) found.passwordHash = "tampered";

    expect((await users.findByEmail(ANA.email))?.passwordHash).toBe(ANA.passwordHash);
  });

  it("stores a copy, so changing the saved object later changes nothing", async () => {
    const users = createInMemoryUserRepository();
    const original = { ...ANA };
    await users.save(original);
    original.passwordHash = "tampered";

    expect((await users.findByEmail(ANA.email))?.passwordHash).toBe(ANA.passwordHash);
  });

  it("hands out copies from list too, so changing a listed user does not change the store", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);
    const [listed] = await users.list();
    listed.passwordHash = "tampered";

    expect((await users.list())[0].passwordHash).toBe(ANA.passwordHash);
  });

  it("returns a new list each time, so adding to the list does not change the store", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);
    const listed = await users.list();
    listed.push(BEN);

    expect(await users.list()).toEqual([ANA]);
  });

  it("finds a user only by the whole email, not by a part of it", async () => {
    const users = createInMemoryUserRepository();
    await users.save(ANA);

    expect(await users.findByEmail("example.com")).toBeUndefined();
  });

  it("does not share data between two repositories", async () => {
    const first = createInMemoryUserRepository();
    const second = createInMemoryUserRepository();
    await first.save(ANA);

    expect(await second.list()).toEqual([]);
  });
});

describe("registerUser with your fake (state testing)", () => {
  it("stores the new user and returns its id and email", async () => {
    const { users, registerUser } = setup();

    const result = await registerUser({ email: "ana@example.com", password: VALID_PASSWORD });

    expect(result).toEqual({ id: "user-1", email: "ana@example.com" });
    expect(await users.findByEmail("ana@example.com")).toBeDefined();
  });

  it("stores a hash of the password, never the password itself", async () => {
    const { users, registerUser } = setup();

    await registerUser({ email: "ana@example.com", password: VALID_PASSWORD });

    expect((await users.findByEmail("ana@example.com"))?.passwordHash).toBe(stubHash(VALID_PASSWORD));
  });

  it("trims and lowercases the email before storing it", async () => {
    const { users, registerUser } = setup();

    await registerUser({ email: "  Ana@Example.COM ", password: VALID_PASSWORD });

    expect(await users.findByEmail("ana@example.com")).toBeDefined();
  });

  it("rejects an email that is already registered, whatever its letter case", async () => {
    const { users, registerUser } = setup();
    await registerUser({ email: "ana@example.com", password: VALID_PASSWORD });

    const second = registerUser({ email: "ANA@example.com", password: VALID_PASSWORD });

    await expect(second).rejects.toThrow(RegistrationError);
    expect(await users.list()).toHaveLength(1);
  });

  it("rejects an invalid email and stores nothing", async () => {
    const { users, registerUser } = setup();

    const attempt = registerUser({ email: "not-an-email", password: VALID_PASSWORD });

    await expect(attempt).rejects.toThrow("invalid email");
    expect(await users.list()).toEqual([]);
  });

  it("rejects a password shorter than eight characters and stores nothing", async () => {
    const { users, registerUser } = setup();

    const attempt = registerUser({ email: "ana@example.com", password: "short" });

    await expect(attempt).rejects.toThrow("password too short");
    expect(await users.list()).toEqual([]);
  });

  it("gives each new user a different id", async () => {
    const { registerUser } = setup();

    const first = await registerUser({ email: "ana@example.com", password: VALID_PASSWORD });
    const second = await registerUser({ email: "ben@example.com", password: VALID_PASSWORD });

    expect([first.id, second.id]).toEqual(["user-1", "user-2"]);
  });
});

describe("registerUser and the welcome email (interaction testing)", () => {
  it("sends exactly one welcome email to the new address", async () => {
    const { mailer, registerUser } = setup();

    await registerUser({ email: "Ana@Example.com", password: VALID_PASSWORD });

    expect(mailer.sendWelcome).toHaveBeenCalledTimes(1);
    expect(mailer.sendWelcome).toHaveBeenCalledWith("ana@example.com");
  });

  it("sends no email when the registration is rejected", async () => {
    const { mailer, registerUser } = setup();
    await registerUser({ email: "ana@example.com", password: VALID_PASSWORD });
    mailer.sendWelcome.mockClear();

    await registerUser({ email: "ana@example.com", password: VALID_PASSWORD }).catch(() => undefined);

    expect(mailer.sendWelcome).not.toHaveBeenCalled();
  });
});
