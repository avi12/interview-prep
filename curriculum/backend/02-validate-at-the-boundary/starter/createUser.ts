import { z } from "zod";

export const createUserSchema = z.object({});

export type CreateUser = z.infer<typeof createUserSchema>;

export function handleCreateUser(body: unknown) {
  return { status: 501, body: {} };
}
