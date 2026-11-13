import type { VerifyIdToken } from "@server/auth.ts";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { zod } from "@/lib/zod.ts";

const SHOULD_CHECK_REVOKED = true;

const INVALID_TOKEN_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-argument",
  "auth/invalid-id-token",
  "auth/user-disabled",
  "auth/user-not-found"
]);

const codedErrorSchema = zod.object({ code: zod.string() });

function isInvalidTokenError(error: unknown) {
  const parsed = codedErrorSchema.safeParse(error);
  return parsed.success && INVALID_TOKEN_CODES.has(parsed.data.code);
}

export function connectFirebase(projectId: string) {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId
  });
  const auth = getAuth(app);
  async function verifyIdToken(token: string) {
    const decoded = await auth.verifyIdToken(token, SHOULD_CHECK_REVOKED).catch((error: unknown) => {
      if (isInvalidTokenError(error)) {
        return null;
      }

      throw error;
    });
    return decoded?.uid ?? null;
  }

  return {
    verifyIdToken: verifyIdToken satisfies VerifyIdToken,
    firestore: getFirestore(app)
  };
}
