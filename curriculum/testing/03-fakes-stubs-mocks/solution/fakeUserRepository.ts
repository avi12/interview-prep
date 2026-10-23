import type { User, UserRepository } from "./registerUser.ts";

function copyOf(user: User) {
  return { ...user };
}

export function createInMemoryUserRepository(): UserRepository {
  const usersById = new Map<string, User>();
  return {
    async findByEmail(email) {
      const found = [...usersById.values()].find(user => user.email === email);
      return found && copyOf(found);
    },
    async save(user) {
      usersById.set(user.id, copyOf(user));
    },
    list: async () => [...usersById.values()].map(copyOf)
  };
}
