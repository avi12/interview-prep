import { zod } from "./zod.ts";

export const TutorBlockKind = {
  HEADING: "heading",
  PARAGRAPH: "paragraph"
} as const;
export type TutorBlockKind = (typeof TutorBlockKind)[keyof typeof TutorBlockKind];

export const tutorBlockSchema = zod.object({
  kind: zod.enum(TutorBlockKind),
  text: zod.string()
});
export type TutorBlock = zod.infer<typeof tutorBlockSchema>;

const tutorTestRunSchema = zod.object({
  ranAt: zod.string(),
  isPass: zod.boolean()
});
export type TutorTestRun = zod.infer<typeof tutorTestRunSchema>;

export const tutorViewSchema = zod.object({
  version: zod.string(),
  title: zod.string(),
  blocks: zod.array(tutorBlockSchema),
  testRun: tutorTestRunSchema.nullable()
});
export type TutorView = zod.infer<typeof tutorViewSchema>;

export const TUTOR_VIEW_PATH = "/tutor-view";

export function tutorHeading(text: string) {
  return {
    kind: TutorBlockKind.HEADING,
    text
  };
}
export function tutorParagraph(text: string) {
  return {
    kind: TutorBlockKind.PARAGRAPH,
    text
  };
}
