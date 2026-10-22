import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Token } from "marked";
import { LESSON_TESTS_DIR_NAME } from "#scripts/lib/layout.ts";
import type { Block, Lesson } from "#scripts/lib/lessons.ts";
import { EXERCISE_CARD_TITLE } from "#scripts/lib/schema.ts";
import { tutorHeading as heading, tutorParagraph as paragraph, type TutorBlock } from "#scripts/lib/tutor-view.ts";

const SKIPPED_TOKEN_TYPES = new Set(["html", "space"]);

const tokensText = (tokens: Token[]) =>
  tokens
    .filter(token => !SKIPPED_TOKEN_TYPES.has(token.type))
    .map(token => token.raw.trim())
    .join("\n\n");

const cardTitle = (title: string) => (title === EXERCISE_CARD_TITLE ? `${title} - the exercise the learner has to solve` : title);

const blockNotes = ({ block, hintNumber }: { block: Block; hintNumber: number }): TutorBlock[] => {
  if (block.kind === "hint") return [paragraph(`Hint ${hintNumber}, for you only: give it only after the learner has tried, one hint at a time. ${block.text}`)];
  if (block.kind === "figure") return [paragraph(`Diagram on the page: ${block.figure.caption}`)];
  if (block.kind === "quiz") {
    const { q, options, answer, why } = block.quiz;
    return [paragraph(`Quiz on the page: ${q} Options: ${options.join(" | ")}. For you only, the answer is "${options[answer]}" because ${why}`)];
  }
  const text = tokensText(block.tokens);
  return text ? [paragraph(text)] : [];
};

const testNotes = (lesson: Lesson): TutorBlock[] => {
  const testsDir = resolve(lesson.dir, LESSON_TESTS_DIR_NAME);
  if (!existsSync(testsDir)) return [];
  const files = readdirSync(testsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.startsWith("_") && !entry.name.startsWith("."))
    .map(entry => entry.name);
  return [
    heading("The tests that check the learner's code, for you only: use them to understand a failure and to guide, never read the expected values out as the answer"),
    ...files.map(name => paragraph(`${name}:
${readFileSync(resolve(testsDir, name), "utf8").trim()}`))
  ];
};

export const tutorNotes = (lesson: Lesson): TutorBlock[] => {
  const notes = [heading(`Lesson: ${lesson.meta.title}`)];
  for (const card of lesson.cards) {
    notes.push(heading(cardTitle(card.title)));
    let hintNumber = 0;
    for (const block of card.blocks) {
      if (block.kind === "hint") hintNumber++;
      notes.push(...blockNotes({ block, hintNumber }));
    }
  }
  notes.push(...testNotes(lesson));
  return notes;
};
