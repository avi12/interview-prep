const WORKBENCH_SELECTOR = "#workbench";
const STATUS_SELECTOR = "#boot-status";
const BOOT_FAILED_ATTRIBUTE = "data-failed";

const elWorkbench = document.querySelector<HTMLElement>(WORKBENCH_SELECTOR);
const elStatus = document.querySelector<HTMLElement>(STATUS_SELECTOR);

async function boot() {
  if (!elWorkbench) {
    return;
  }

  const { startWorkbench } = await import("@/workbench/start.ts");
  await startWorkbench(elWorkbench);
}

boot().catch((error: unknown) => {
  if (!elStatus) {
    return;
  }

  elStatus.setAttribute(BOOT_FAILED_ATTRIBUTE, "");
  elStatus.textContent = `VS Code did not start: ${error instanceof Error ? error.message : String(error)}`;
});
