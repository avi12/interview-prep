export const PanelAction = {
  runTests: "runTests",
  openExercise: "openExercise",
  resetExercise: "resetExercise",
  markDone: "markDone"
} as const;

export type PanelActionName = (typeof PanelAction)[keyof typeof PanelAction];

export const DONE_COMMAND = "done";
