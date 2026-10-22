export const PanelAction = {
  runTests: "runTests",
  openExercise: "openExercise",
  resetExercise: "resetExercise",
  markDone: "markDone",
  viewing: "viewing"
} as const;

export type PanelActionName = (typeof PanelAction)[keyof typeof PanelAction];

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
