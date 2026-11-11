import { browserStorage } from "@/lib/browser-storage.ts";
import { ProgressSession } from "@/lib/progress-session.ts";
import { createLocalProgressStore } from "@/lib/progress-store.ts";
import { activateCourseExtension, registerCourseExtension } from "@/workbench/course-extension.ts";
import { startServices } from "@/workbench/services.ts";
import { activateSiteExtension, registerSiteExtension } from "@/workbench/site-extension.ts";
import { configureWorkers } from "@/workbench/workers.ts";
import { mountWorkspaceFiles } from "@/workbench/workspace-files.ts";

export async function startWorkbench(container: HTMLElement) {
  configureWorkers();
  const session = new ProgressSession(createLocalProgressStore(browserStorage()));
  const siteExtension = registerSiteExtension();
  const courseExtension = registerCourseExtension();
  await Promise.all([mountWorkspaceFiles(), session.showLocal()]);
  await startServices(container);
  await activateSiteExtension({
    extension: siteExtension,
    session
  });
  await activateCourseExtension({
    extension: courseExtension,
    session
  });
}
