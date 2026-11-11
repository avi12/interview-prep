import { installGlobals } from "@/runner/ts/globals.ts";
import { runRequestSchema, type RunResponse, WorkerReply } from "@/runner/ts/protocol.ts";
import { errorText, workerScope } from "@/runner/worker-channel.ts";

installGlobals();

function reply(response: RunResponse) {
  workerScope.postMessage(response);
}

workerScope.addEventListener("message", async e => {
  const parsed = runRequestSchema.safeParse(e.data);
  if (!parsed.success) {
    reply({
      kind: WorkerReply.crash,
      message: `Bad run request: ${parsed.error.message}`
    });
    return;
  }

  try {
    const { runSuite } = await import("@/runner/ts/run-suite.ts");
    reply(await runSuite(parsed.data));
  } catch (error) {
    reply({
      kind: WorkerReply.crash,
      message: errorText(error)
    });
  }
});
