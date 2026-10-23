export type Role = "user" | "admin" | "auditor";
export type User = {
  id: string;
  role: Role;
};
export type Invoice = {
  id: string;
  ownerId: string;
  amountCents: number;
};
export type Database = { invoices: Map<string, Invoice> };

type Permissions = {
  canReadAny: boolean;
  canDeleteAny: boolean;
};

const STATUS = {
  ok: 200,
  noContent: 204,
  unauthenticated: 401,
  forbidden: 403,
  notFound: 404
} as const;

const NOT_FOUND = {
  status: STATUS.notFound,
  body: {
    error: "not_found"
  }
};
const UNAUTHENTICATED = {
  status: STATUS.unauthenticated,
  body: {
    error: "login_required"
  }
};
const FORBIDDEN = {
  status: STATUS.forbidden,
  body: {
    error: "forbidden"
  }
};

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  user: {
    canReadAny: false,
    canDeleteAny: false
  },
  auditor: {
    canReadAny: true,
    canDeleteAny: false
  },
  admin: {
    canReadAny: true,
    canDeleteAny: true
  }
};

function permissionsOf(user: User): Permissions | undefined {
  return Object.hasOwn(PERMISSIONS_BY_ROLE, user.role) ? PERMISSIONS_BY_ROLE[user.role] : undefined;
}

function isOwner({ user, invoice }: {
  user: User;
  invoice: Invoice;
}) {
  return invoice.ownerId === user.id;
}

function canRead({ user, invoice, permissions }: {
  user: User;
  invoice: Invoice;
  permissions: Permissions;
}) {
  return isOwner({
    user,
    invoice
  }) || permissions.canReadAny;
}

function canDelete({ user, invoice, permissions }: {
  user: User;
  invoice: Invoice;
  permissions: Permissions;
}) {
  return isOwner({
    user,
    invoice
  }) || permissions.canDeleteAny;
}

export function getInvoice({ db, user, invoiceId }: {
  db: Database;
  user: User | null;
  invoiceId: string;
}) {
  if (!user) {
    return UNAUTHENTICATED;
  }

  const permissions = permissionsOf(user);
  if (!permissions) {
    return FORBIDDEN;
  }

  const invoice = db.invoices.get(invoiceId);
  if (!invoice || !canRead({
    user,
    invoice,
    permissions
  })) {
    return NOT_FOUND;
  }

  return {
    status: STATUS.ok,
    body: invoice
  };
}

export function listInvoices({ db, user }: {
  db: Database;
  user: User | null;
}) {
  if (!user) {
    return UNAUTHENTICATED;
  }

  const permissions = permissionsOf(user);
  if (!permissions) {
    return FORBIDDEN;
  }

  const visible = [...db.invoices.values()].filter(invoice => canRead({
    user,
    invoice,
    permissions
  }));
  return {
    status: STATUS.ok,
    body: visible
  };
}

export function deleteInvoice({ db, user, invoiceId }: {
  db: Database;
  user: User | null;
  invoiceId: string;
}) {
  if (!user) {
    return UNAUTHENTICATED;
  }

  const permissions = permissionsOf(user);
  if (!permissions) {
    return FORBIDDEN;
  }

  const invoice = db.invoices.get(invoiceId);
  if (!invoice || !canRead({
    user,
    invoice,
    permissions
  })) {
    return NOT_FOUND;
  }

  if (!canDelete({
    user,
    invoice,
    permissions
  })) {
    return FORBIDDEN;
  }

  db.invoices.delete(invoiceId);
  return {
    status: STATUS.noContent,
    body: null
  };
}
