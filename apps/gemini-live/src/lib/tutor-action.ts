export const TutorAction = {
  START: "start",
  STOP: "stop"
} as const;
export type TutorAction = (typeof TutorAction)[keyof typeof TutorAction];

export function tutorActionSelector(action: TutorAction) {
  return `[data-tutor-action="${action}"]`;
}
