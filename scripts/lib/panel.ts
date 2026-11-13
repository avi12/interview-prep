import { scriptJson } from "#scripts/lib/html.ts";
import { zod } from "#scripts/lib/zod.ts";

export const PanelAction = {
  RUN_TESTS: "runTests",
  OPEN_EXERCISE: "openExercise",
  RESET_EXERCISE: "resetExercise",
  MARK_DONE: "markDone",
  NEXT_LESSON: "nextLesson",
  OPEN_FILE: "openFile",
  VIEWING: "viewing"
} as const;

const PANEL_COMMANDS = [
  PanelAction.RUN_TESTS,
  PanelAction.OPEN_EXERCISE,
  PanelAction.RESET_EXERCISE,
  PanelAction.MARK_DONE,
  PanelAction.NEXT_LESSON
] as const;

export const panelMessageSchema = zod.union([
  zod.object({ action: zod.enum(PANEL_COMMANDS) }),
  zod.object({
    action: zod.literal(PanelAction.OPEN_FILE),
    file: zod.string()
  }),
  zod.object({
    action: zod.literal(PanelAction.VIEWING),
    section: zod.string()
  })
]);

export type PanelCommand = (typeof PANEL_COMMANDS)[number];

const PASSED_CLASS = "is-passed";
export const PASSED_SCRIPT = `document.documentElement.classList.add(${JSON.stringify(PASSED_CLASS)});`;
export const SCROLL_TO_TOP_SCRIPT = `addEventListener("load", () => setTimeout(() => scrollTo(0, 0)));`;

export const DONE_COMMAND = "done";

const NAMED_NEXT_LABELS = {
  [PanelAction.NEXT_LESSON]: "Next: ",
  [PanelAction.MARK_DONE]: "Done - next: "
};

export function nextLessonScript(nextName: string) {
  const labels = scriptJson(NAMED_NEXT_LABELS);
  const name = scriptJson(nextName);
  return `
for (const [action, prefix] of Object.entries(${labels})) {
  const elButton = document.querySelector(\`button[data-action="\${action}"]\`);
  if (elButton) elButton.textContent = prefix + ${name};
}`;
}

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
    host.postMessage({ action: ${JSON.stringify(PanelAction.VIEWING)}, section });
  };
  addEventListener("scroll", () => requestAnimationFrame(reportViewing), { passive: true });
  reportViewing();
}`;
