import { Worker } from "@/workbench/worker-url.ts";

const WORKERS: Record<string, Worker> = {
  editorWorkerService: new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), {
    type: "module"
  }),
  TextMateWorker: new Worker(new URL("@codingame/monaco-vscode-textmate-service-override/worker", import.meta.url), {
    type: "module"
  }),
  OutputLinkDetectionWorker: new Worker(
    new URL("@codingame/monaco-vscode-output-service-override/worker", import.meta.url),
    { type: "module" }
  ),
  LocalFileSearchWorker: new Worker(
    new URL("@codingame/monaco-vscode-search-service-override/worker", import.meta.url),
    { type: "module" }
  )
};

export function configureWorkers() {
  window.MonacoEnvironment = {
    getWorkerUrl: (_moduleId, label) => WORKERS[label]?.url.toString(),
    getWorkerOptions: (_moduleId, label) => WORKERS[label]?.options
  };
}
