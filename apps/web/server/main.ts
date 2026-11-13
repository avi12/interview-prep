import { serve } from "@hono/node-server";
import { createApp } from "@server/app.ts";
import { readConfig } from "@server/config.ts";
import { connectFirebase } from "@server/firebase.ts";
import { createFirestoreProgressStore } from "@server/firestore-progress-store.ts";
import { Severity, writeLogLine } from "@server/logging.ts";

const LISTEN_HOST = "0.0.0.0";
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;

const config = readConfig(process.env);
const { verifyIdToken, firestore } = connectFirebase(config.projectId);
const app = createApp({
  verifyIdToken,
  progressStore: createFirestoreProgressStore({
    firestore,
    log: writeLogLine
  }),
  clientRoot: config.clientRoot,
  contentRoot: config.contentRoot,
  log: writeLogLine
});

const server = serve(
  {
    fetch: app.fetch,
    hostname: LISTEN_HOST,
    port: config.port
  },
  info =>
    writeLogLine({
      severity: Severity.INFO,
      message: `Listening on ${LISTEN_HOST}:${info.port}`
    })
);

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, () => {
    writeLogLine({
      severity: Severity.INFO,
      message: `${signal} received, closing the server`
    });
    server.close(async () => {
      await firestore.terminate();
      process.exit(0);
    });
  });
}
