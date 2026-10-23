export type Role = "user" | "admin" | "auditor";
export type User = { id: string; role: Role };
export type Invoice = { id: string; ownerId: string; amountCents: number };
export type Database = { invoices: Map<string, Invoice> };

const NOT_FOUND = { status: 404, body: { error: "not_found" } };

export function getInvoice({ db, user, invoiceId }: { db: Database; user: User | null; invoiceId: string }) {
  const invoice = db.invoices.get(invoiceId);
  if (!invoice) return NOT_FOUND;
  return { status: 200, body: invoice };
}

export function listInvoices({ db, user }: { db: Database; user: User | null }) {
  return { status: 200, body: [...db.invoices.values()] };
}

export function deleteInvoice({ db, user, invoiceId }: { db: Database; user: User | null; invoiceId: string }) {
  db.invoices.delete(invoiceId);
  return { status: 204, body: null };
}
