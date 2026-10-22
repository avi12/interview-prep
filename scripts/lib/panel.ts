export const PanelAction = {
  runTests: "runTests",
  openExercise: "openExercise",
  resetExercise: "resetExercise",
  markDone: "markDone",
  viewing: "viewing"
} as const;

export type PanelActionName = (typeof PanelAction)[keyof typeof PanelAction];

type NoPayload = Record<never, never>;

export interface PanelMessageMap {
  [PanelAction.runTests]: NoPayload;
  [PanelAction.openExercise]: NoPayload;
  [PanelAction.resetExercise]: NoPayload;
  [PanelAction.markDone]: NoPayload;
  [PanelAction.viewing]: { section: string };
}

export type PanelMessage = { [Action in PanelActionName]: { action: Action } & PanelMessageMap[Action] }[PanelActionName];

export type PanelCommand = Exclude<PanelActionName, typeof PanelAction.viewing>;

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
