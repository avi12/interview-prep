import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Result = { status: number; body: any };
type Module = {
  createUserSchema: { safeParse: (input: unknown) => { success: boolean; data?: any } };
  handleCreateUser: (body: unknown) => Result;
};

const { createUserSchema, handleCreateUser } = await loadImpl<Module>({ testUrl: import.meta.url, file: "createUser.ts" });

const validBody = { name: "Dana Cohen", email: "dana@example.com", age: 29 };

describe("createUserSchema: parse, do not just check", () => {
  it("accepts a valid user", () => {
    expect(createUserSchema.safeParse(validBody)).toMatchObject({ success: true, data: validBody });
  });

  it("normalizes while parsing: trims the name and lowercases and trims the email", () => {
    const result = createUserSchema.safeParse({ name: "  Dana  ", email: "  DANA@Example.COM ", age: 29 });
    expect(result.data).toEqual({ name: "Dana", email: "dana@example.com", age: 29 });
  });

  it("drops fields it does not know, so a client cannot smuggle in isAdmin", () => {
    const result = createUserSchema.safeParse({ ...validBody, isAdmin: true, role: "admin" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validBody);
  });
});

describe("handleCreateUser", () => {
  it("answers 201 with the parsed user", () => {
    expect(handleCreateUser(validBody)).toEqual({ status: 201, body: { user: validBody } });
  });

  it("answers 201 with the normalized user, not the raw input", () => {
    const { body } = handleCreateUser({ name: " Noa ", email: "NOA@EXAMPLE.COM", age: 31 });
    expect(body.user).toEqual({ name: "Noa", email: "noa@example.com", age: 31 });
  });

  it("never returns fields the client was not allowed to set", () => {
    const { body } = handleCreateUser({ ...validBody, isAdmin: true });
    expect(body.user).not.toHaveProperty("isAdmin");
  });

  it("a missing body or one that is not a JSON object is 400", () => {
    for (const body of [undefined, null, "text", 42, ["list"]]) expect(handleCreateUser(body).status).toBe(400);
  });

  it("an empty object is 422 with an error for each of the three fields", () => {
    const { status, body } = handleCreateUser({});
    expect(status).toBe(422);
    expect(Object.keys(body.errors).sort()).toEqual(["age", "email", "name"]);
  });

  it("reports only the fields that are wrong, each with at least one message", () => {
    const { status, body } = handleCreateUser({ ...validBody, email: "not-an-email" });
    expect(status).toBe(422);
    expect(Object.keys(body.errors)).toEqual(["email"]);
    expect(body.errors.email.length).toBeGreaterThan(0);
    expect(typeof body.errors.email[0]).toBe("string");
  });

  it("reports several wrong fields at once, so the client fixes everything in one round trip", () => {
    const { body } = handleCreateUser({ name: "", email: "x", age: 3 });
    expect(Object.keys(body.errors).sort()).toEqual(["age", "email", "name"]);
  });

  it("does not trust client types: a number sent as a string is rejected", () => {
    const { status, body } = handleCreateUser({ ...validBody, age: "29" });
    expect(status).toBe(422);
    expect(Object.keys(body.errors)).toEqual(["age"]);
  });

  it("rejects ages that are fractions or outside the allowed range", () => {
    for (const age of [29.5, 12, 121, -1, 0, Number.NaN, Number.POSITIVE_INFINITY, true, null]) {
      expect(handleCreateUser({ ...validBody, age }).status).toBe(422);
    }
  });

  it("accepts the youngest and the oldest allowed age", () => {
    for (const age of [13, 120]) {
      expect(handleCreateUser({ ...validBody, age })).toMatchObject({ status: 201, body: { user: { age } } });
    }
  });

  it("rejects text that is not an email address", () => {
    for (const email of ["dana@", "@example.com", "dana@example", "da na@example.com", "dana@@example.com", "dana.example.com", ""]) {
      const { status, body } = handleCreateUser({ ...validBody, email });
      expect(status, email).toBe(422);
      expect(Object.keys(body.errors)).toEqual(["email"]);
    }
  });

  it("rejects a blank name and a name longer than 50 characters", () => {
    expect(handleCreateUser({ ...validBody, name: "   " }).status).toBe(422);
    expect(handleCreateUser({ ...validBody, name: "x".repeat(51) }).status).toBe(422);
    expect(handleCreateUser({ ...validBody, name: "x".repeat(50) }).status).toBe(201);
    expect(handleCreateUser({ ...validBody, name: "x" }).status).toBe(201);
  });

  it("rejects values of the wrong type without throwing", () => {
    const junk = [{ name: {}, email: [], age: {} }, { name: null, email: null, age: null }, JSON.parse('{"__proto__": {"isAdmin": true}}')];
    for (const body of junk) {
      expect(() => handleCreateUser(body)).not.toThrow();
      expect([400, 422]).toContain(handleCreateUser(body).status);
    }
    expect(({} as any).isAdmin).toBeUndefined();
  });
});
