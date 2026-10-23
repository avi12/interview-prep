import type { User, UserRepository } from "./registerUser.ts";

const copyOf = (user: User) => ({ ...user });

export function createInMemoryUserRepository(): UserRepository {
  const usersById = new Map<string, User>();
  return {
    findByEmail: async email => {
      const found = [...usersById.values()].find(user => user.email === email);
      return found && copyOf(found);
    },
    save: async user => {
      usersById.set(user.id, copyOf(user));
    },
    list: async () => [...usersById.values()].map(copyOf)
  };
}
