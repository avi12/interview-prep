export const PanelAction = {
  runTests: "runTests",
  openExercise: "openExercise",
  resetExercise: "resetExercise",
  markDone: "markDone",
  viewing: "viewing"
} as const;

export type PanelActionName = (typeof PanelAction)[keyof typeof PanelAction];

export const DONE_COMMAND = "done";
