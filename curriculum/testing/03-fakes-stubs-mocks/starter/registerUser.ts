export type User = { id: string; email: string; passwordHash: string };

export type UserRepository = {
  findByEmail: (email: string) => Promise<User | undefined>;
  save: (user: User) => Promise<void>;
  list: () => Promise<User[]>;
};

export type Mailer = { sendWelcome: (email: string) => Promise<void> };

export type Dependencies = {
  users: UserRepository;
  mailer: Mailer;
  hashPassword: (password: string) => string;
  newId: () => string;
};

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegistrationError extends Error {}

export const createRegisterUser =
  ({ users, mailer, hashPassword, newId }: Dependencies) =>
  async ({ email, password }: { email: string; password: string }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) throw new RegistrationError("invalid email");
    if (password.length < MIN_PASSWORD_LENGTH) throw new RegistrationError("password too short");
    if (await users.findByEmail(normalizedEmail)) throw new RegistrationError("email already registered");
    const user = { id: newId(), email: normalizedEmail, passwordHash: hashPassword(password) };
    await users.save(user);
    await mailer.sendWelcome(normalizedEmail);
    return { id: user.id, email: user.email };
  };
