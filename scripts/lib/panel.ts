import { z } from "#scripts/lib/zod.ts";

export const PanelAction = {
  runTests: "runTests",
  openExercise: "openExercise",
  resetExercise: "resetExercise",
  markDone: "markDone",
  nextLesson: "nextLesson",
  viewing: "viewing"
} as const;

const PANEL_COMMANDS = [
  PanelAction.runTests,
  PanelAction.openExercise,
  PanelAction.resetExercise,
  PanelAction.markDone,
  PanelAction.nextLesson
] as const;

export const panelMessageSchema = z.union([
  z.object({ action: z.enum(PANEL_COMMANDS) }),
  z.object({
    action: z.literal(PanelAction.viewing),
    section: z.string()
  })
]);

export type PanelCommand = (typeof PANEL_COMMANDS)[number];

const PASSED_CLASS = "is-passed";
export const PASSED_SCRIPT = `document.documentElement.classList.add(${JSON.stringify(PASSED_CLASS)});`;
export const SCROLL_TO_TOP_SCRIPT = `addEventListener("load", () => setTimeout(() => scrollTo(0, 0)));`;

export const DONE_COMMAND = "done";

export const VIEWING_SCRIPT = `
if (typeof host !== "undefined" && host) {
  const cards = [...document.querySelectorAll("section.card")];
  let viewing = "";
  const reportViewing = () => {
    const middle = innerHeight / 2;
    const card = cards.find(c => { const r = c.getBoundingClientRect(); return r.top <= middle && r.bottom >= middle; }) ?? cards.find(c => c.getBoundingClientRect().bottom > 0);
    const section = card?.querySelector(".card-head")?.textContent ?? "";
    if (section === viewing) return;
    viewing = section;
    host.postMessage({ action: ${JSON.stringify(PanelAction.viewing)}, section });
  };
  addEventListener("scroll", () => requestAnimationFrame(reportViewing), { passive: true });
  reportViewing();
}`;
