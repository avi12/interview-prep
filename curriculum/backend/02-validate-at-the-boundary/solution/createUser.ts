import { z } from "zod";

const NAME_MAX_LENGTH = 50;
const AGE_MIN = 13;
const AGE_MAX = 120;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(NAME_MAX_LENGTH, `name must be at most ${NAME_MAX_LENGTH} characters`),
  email: z.string().trim().toLowerCase().pipe(z.email("email must be a valid address")),
  age: z.number().int("age must be a whole number").min(AGE_MIN, `age must be at least ${AGE_MIN}`).max(AGE_MAX, `age must be at most ${AGE_MAX}`)
});

export type CreateUser = z.infer<typeof createUserSchema>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function handleCreateUser(body: unknown) {
  if (!isPlainObject(body)) {
    return {
      status: 400,
      body: {
        error: "Body must be a JSON object"
      }
    };
  }

  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return {
      status: 422,
      body: {
        errors: z.flattenError(result.error).fieldErrors
      }
    };
  }

  return {
    status: 201,
    body: {
      user: result.data
    }
  };
}
