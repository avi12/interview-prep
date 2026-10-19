import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Role = "user" | "admin" | "auditor";
type User = { id: string; role: Role };
type Invoice = { id: string; ownerId: string; amountCents: number };
type Database = { invoices: Map<string, Invoice> };
type Response = { status: number; body: unknown };
type Module = {
  getInvoice: (input: { db: Database; user: User | null; invoiceId: string }) => Response;
  listInvoices: (input: { db: Database; user: User | null }) => Response;
  deleteInvoice: (input: { db: Database; user: User | null; invoiceId: string }) => Response;
};

const { getInvoice, listInvoices, deleteInvoice } = await loadImpl<Module>({ testUrl: import.meta.url, file: "invoices.ts" });

const ALICE: User = { id: "alice", role: "user" };
const BOB: User = { id: "bob", role: "user" };
const ADMIN: User = { id: "root", role: "admin" };
const AUDITOR: User = { id: "audrey", role: "auditor" };
const INTERN = { id: "ivan", role: "intern" } as unknown as User;

const SECRET_AMOUNT_CENTS = 987_654;

const makeDb = (): Database => ({
  invoices: new Map([
    ["inv-1", { id: "inv-1", ownerId: "alice", amountCents: 1000 }],
    ["inv-2", { id: "inv-2", ownerId: "alice", amountCents: 2000 }],
    ["inv-3", { id: "inv-3", ownerId: "bob", amountCents: SECRET_AMOUNT_CENTS }]
  ])
});

const idsOf = (response: Response) => (response.body as Invoice[]).map(invoice => invoice.id).sort();

describe("getInvoice", () => {
  it("lets an owner read their own invoice", () => {
    const response = getInvoice({ db: makeDb(), user: ALICE, invoiceId: "inv-1" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "inv-1", ownerId: "alice", amountCents: 1000 });
  });

  it("answers 401 when nobody is logged in", () => {
    expect(getInvoice({ db: makeDb(), user: null, invoiceId: "inv-1" }).status).toBe(401);
  });

  it("does not let alice read bob's invoice by changing the id (IDOR)", () => {
    const response = getInvoice({ db: makeDb(), user: ALICE, invoiceId: "inv-3" });
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(String(SECRET_AMOUNT_CENTS));
  });

  it("answers an invoice you may not see exactly like one that does not exist", () => {
    const db = makeDb();
    const someoneElses = getInvoice({ db, user: ALICE, invoiceId: "inv-3" });
    const missing = getInvoice({ db, user: ALICE, invoiceId: "inv-999" });
    expect(someoneElses).toEqual(missing);
  });

  it("lets an admin read any invoice", () => {
    expect(getInvoice({ db: makeDb(), user: ADMIN, invoiceId: "inv-3" }).status).toBe(200);
  });

  it("lets an auditor read any invoice", () => {
    expect(getInvoice({ db: makeDb(), user: AUDITOR, invoiceId: "inv-3" }).status).toBe(200);
  });

  it("denies by default: an unknown role gets 403, even on its own data", () => {
    const db = makeDb();
    db.invoices.set("inv-9", { id: "inv-9", ownerId: "ivan", amountCents: 5 });
    expect(getInvoice({ db, user: INTERN, invoiceId: "inv-9" }).status).toBe(403);
  });
});

describe("listInvoices", () => {
  it("shows a user only their own invoices", () => {
    const response = listInvoices({ db: makeDb(), user: ALICE });
    expect(response.status).toBe(200);
    expect(idsOf(response)).toEqual(["inv-1", "inv-2"]);
  });

  it("does not leak other people's amounts in the list", () => {
    const response = listInvoices({ db: makeDb(), user: BOB });
    expect(JSON.stringify(response.body)).not.toContain('"alice"');
    expect(idsOf(response)).toEqual(["inv-3"]);
  });

  it("shows admins and auditors everything", () => {
    expect(idsOf(listInvoices({ db: makeDb(), user: ADMIN }))).toEqual(["inv-1", "inv-2", "inv-3"]);
    expect(idsOf(listInvoices({ db: makeDb(), user: AUDITOR }))).toEqual(["inv-1", "inv-2", "inv-3"]);
  });

  it("answers 401 when nobody is logged in, and 403 for an unknown role", () => {
    expect(listInvoices({ db: makeDb(), user: null }).status).toBe(401);
    expect(listInvoices({ db: makeDb(), user: INTERN }).status).toBe(403);
  });
});

describe("deleteInvoice", () => {
  it("lets an owner delete their own invoice", () => {
    const db = makeDb();
    expect(deleteInvoice({ db, user: ALICE, invoiceId: "inv-1" }).status).toBe(204);
    expect(db.invoices.has("inv-1")).toBe(false);
  });

  it("does not let alice delete bob's invoice, and the invoice survives", () => {
    const db = makeDb();
    const response = deleteInvoice({ db, user: ALICE, invoiceId: "inv-3" });
    expect(response.status).toBe(404);
    expect(db.invoices.has("inv-3")).toBe(true);
  });

  it("lets an admin delete any invoice", () => {
    const db = makeDb();
    expect(deleteInvoice({ db, user: ADMIN, invoiceId: "inv-3" }).status).toBe(204);
    expect(db.invoices.has("inv-3")).toBe(false);
  });

  it("answers 403 to an auditor: they may see the invoice but have no delete permission", () => {
    const db = makeDb();
    expect(deleteInvoice({ db, user: AUDITOR, invoiceId: "inv-3" }).status).toBe(403);
    expect(db.invoices.has("inv-3")).toBe(true);
  });

  it("answers 401 when nobody is logged in, and changes nothing", () => {
    const db = makeDb();
    expect(deleteInvoice({ db, user: null, invoiceId: "inv-1" }).status).toBe(401);
    expect(db.invoices.size).toBe(3);
  });

  it("denies by default: an unknown role cannot delete", () => {
    const db = makeDb();
    expect(deleteInvoice({ db, user: INTERN, invoiceId: "inv-1" }).status).toBe(403);
    expect(db.invoices.size).toBe(3);
  });

  it("answers a missing invoice with 404", () => {
    expect(deleteInvoice({ db: makeDb(), user: ALICE, invoiceId: "inv-999" }).status).toBe(404);
  });
});
