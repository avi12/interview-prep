import type { UserRepository } from "./registerUser.ts";

export function createInMemoryUserRepository(): UserRepository {
  return {
    async findByEmail() {
      throw new Error("not implemented");
    },
    async save() {
      throw new Error("not implemented");
    },
    async list() {
      throw new Error("not implemented");
    }
  };
}
