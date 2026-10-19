import type { UserRepository } from "./registerUser.ts";

export function createInMemoryUserRepository(): UserRepository {
  return {
    findByEmail: async () => {
      throw new Error("not implemented");
    },
    save: async () => {
      throw new Error("not implemented");
    },
    list: async () => {
      throw new Error("not implemented");
    }
  };
}
