export const TutorBlockKind = { HEADING: "heading", PARAGRAPH: "paragraph" } as const;
export type TutorBlockKind = (typeof TutorBlockKind)[keyof typeof TutorBlockKind];

export interface TutorBlock {
  kind: TutorBlockKind;
  text: string;
}

export interface TutorView {
  version: string;
  title: string;
  blocks: TutorBlock[];
}

export const TUTOR_VIEW_PATH = "/tutor-view";

export const tutorHeading = (text: string): TutorBlock => ({ kind: TutorBlockKind.HEADING, text });
export const tutorParagraph = (text: string): TutorBlock => ({ kind: TutorBlockKind.PARAGRAPH, text });
