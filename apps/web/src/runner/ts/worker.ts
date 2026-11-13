import { installGlobals } from "@/runner/ts/globals.ts";
import { runRequestSchema, type RunResponse, WorkerReply } from "@/runner/ts/protocol.ts";
import { errorText, workerScope } from "@/runner/worker-channel.ts";

installGlobals();

function reply(response: RunResponse) {
  workerScope.postMessage(response);
}

workerScope.addEventListener("message", async event => {
  const parsed = runRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    reply({
      kind: WorkerReply.CRASH,
      message: `Bad run request: ${parsed.error.message}`
    });
    return;
  }

  try {
    const { runSuite } = await import("@/runner/ts/run-suite.ts");
    reply(await runSuite(parsed.data));
  } catch (error) {
    reply({
      kind: WorkerReply.CRASH,
      message: errorText(error)
    });
  }
});
