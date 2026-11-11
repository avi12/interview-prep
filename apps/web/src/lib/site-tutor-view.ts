import { z } from "@/lib/zod.ts";
import { tutorNotesSchema } from "#scripts/lib/schema.ts";
import { type TutorBlock, TutorBlockKind, type TutorView, tutorViewSchema } from "#scripts/lib/tutor-view.ts";

const NO_LESSON_TITLE = "No lesson open";
const HASH_SEED = 5381;
const HASH_MULTIPLIER = 33;
const HASH_RADIX = 36;
const MAX_CODE_CHARACTERS = 6000;

export const siteViewSourcesSchema = z.object({
  lessonTitle: z.string().nullable(),
  notes: tutorNotesSchema,
  file: z.object({
    name: z.string(),
    code: z.string()
  }).nullable(),
  lastTest: z.object({
    ranAt: z.string(),
    isPass: z.boolean()
  }).nullable()
});
export type SiteViewSources = z.infer<typeof siteViewSourcesSchema>;

function hashOf(text: string) {
  let hash = HASH_SEED;
  for (const character of text) {
    hash = (hash * HASH_MULTIPLIER + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash.toString(HASH_RADIX);
}

function heading(text: string): TutorBlock {
  return {
    kind: TutorBlockKind.HEADING,
    text
  };
}

function paragraph(text: string): TutorBlock {
  return {
    kind: TutorBlockKind.PARAGRAPH,
    text
  };
}

function fileBlocks(file: SiteViewSources["file"]) {
  if (!file) {
    return [paragraph("No exercise file is open.")];
  }

  return [
    paragraph(`The learner has ${file.name} open. Their code so far:`),
    paragraph(file.code.slice(0, MAX_CODE_CHARACTERS))
  ];
}

export function buildSiteTutorView(sources: SiteViewSources): TutorView {
  const { lessonTitle, notes, file, lastTest } = siteViewSourcesSchema.parse(sources);
  const blocks = [
    heading("What the learner is doing right now"),
    ...fileBlocks(file),
    ...notes
  ];
  const title = lessonTitle ?? NO_LESSON_TITLE;
  return tutorViewSchema.parse({
    version: hashOf(
      JSON.stringify({
        title,
        blocks,
        lastTest
      })
    ),
    title,
    blocks,
    testRun: lastTest
  });
}
