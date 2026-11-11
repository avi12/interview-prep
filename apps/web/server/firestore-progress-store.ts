import { z } from "@/lib/zod.ts";
import type { Log } from "@server/logging.ts";
import { Severity } from "@server/logging.ts";
import type { ProgressStore } from "@server/progress-store.ts";
import { USERS_COLLECTION } from "#scripts/lib/gcp.ts";
import { syncedProgressSchema } from "#scripts/lib/progress-sync.ts";
import { FieldValue, type Firestore } from "firebase-admin/firestore";

const storedUserSchema = z.object({ progress: syncedProgressSchema });

export function createFirestoreProgressStore({ firestore, log }: {
  firestore: Firestore;
  log: Log;
}): ProgressStore {
  const users = firestore.collection(USERS_COLLECTION);

  function progressOf({ uid, data }: {
    uid: string;
    data: unknown;
  }) {
    if (data === undefined) {
      return {};
    }

    const parsed = storedUserSchema.safeParse(data);
    if (parsed.success) {
      return parsed.data.progress;
    }

    log({
      severity: Severity.error,
      message: "Stored progress is corrupt, treating it as empty",
      uid,
      issues: parsed.error.issues.map(issue => issue.path.join("."))
    });
    return {};
  }

  return {
    read: async uid => progressOf({
      uid,
      data: (await users.doc(uid).get()).data()
    }),
    update: ({ uid, apply }) => firestore.runTransaction(async transaction => {
      const ref = users.doc(uid);
      const snapshot = await transaction.get(ref);
      const progress = apply(
        progressOf({
          uid,
          data: snapshot.data()
        })
      );
      transaction.set(ref, {
        progress,
        updatedAt: FieldValue.serverTimestamp()
      });
      return progress;
    })
  };
}
