import { z } from "./zod.ts";

export const TutorBlockKind = {
  HEADING: "heading",
  PARAGRAPH: "paragraph"
} as const;
export type TutorBlockKind = (typeof TutorBlockKind)[keyof typeof TutorBlockKind];

export const tutorBlockSchema = z.object({
  kind: z.enum(TutorBlockKind),
  text: z.string()
});
export type TutorBlock = z.infer<typeof tutorBlockSchema>;

const tutorTestRunSchema = z.object({
  ranAt: z.string(),
  isPass: z.boolean()
});
export type TutorTestRun = z.infer<typeof tutorTestRunSchema>;

export const tutorViewSchema = z.object({
  version: z.string(),
  title: z.string(),
  blocks: z.array(tutorBlockSchema),
  testRun: tutorTestRunSchema.nullable()
});
export type TutorView = z.infer<typeof tutorViewSchema>;

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
