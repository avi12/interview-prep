export const TutorBlockKind = {
  HEADING: "heading",
  PARAGRAPH: "paragraph"
} as const;
export type TutorBlockKind = (typeof TutorBlockKind)[keyof typeof TutorBlockKind];

export interface TutorBlock {
  kind: TutorBlockKind;
  text: string;
}

export interface TutorTestRun {
  ranAt: string;
  isPass: boolean;
}

export interface TutorView {
  version: string;
  title: string;
  blocks: TutorBlock[];
  testRun: TutorTestRun | null;
}

export const TUTOR_VIEW_PATH = "/tutor-view";

export function tutorHeading(text: string): TutorBlock {
  return {
    kind: TutorBlockKind.HEADING,
    text
  };
}
export function tutorParagraph(text: string): TutorBlock {
  return {
    kind: TutorBlockKind.PARAGRAPH,
    text
  };
}
