import { REPOSITORY_URL } from "#scripts/lib/repository.ts";

const EXTEND_SKILL_PATH = ".claude/skills/extend-curriculum/SKILL.md";
const TOPIC_PLACEHOLDER = "<topic>";

const REQUIREMENTS = [
  "Read AGENTS.md, curriculum/LEARNER.md and curriculum/AUTHORING.md first, and follow them exactly.",
  "Follow best practices: the code style in AGENTS.md, the lesson rules in AUTHORING.md, and the current best practices and official documentation of the topic itself. Never teach outdated or deprecated habits.",
  "Before writing anything, do extensive online research on how to present this topic in an accessible way that puts the learner in the mindset of learning it: official docs, respected teaching material and learning-science guidance on worked examples, analogies, short cards, visuals and practice. Design every lesson from what you find, and list your sources in the pull request description.",
  "Run pnpm verify for the new track until it is green, then pnpm lint, pnpm stylelint, pnpm typecheck and pnpm fallow.",
  "Commit in small steps, one logical change per commit, then open a pull request against the original repository."
] as const;

const REQUIREMENTS_TEXT = REQUIREMENTS.join(" ");

const ADD_TOPIC_PROMPTS = {
  claudeCode: `/extend-curriculum add a new track about ${TOPIC_PLACEHOLDER}, with 3 to 5 lessons, in the category that fits best. ${REQUIREMENTS_TEXT}`,
  anyAgent: `Follow ${EXTEND_SKILL_PATH} to add a new track about ${TOPIC_PLACEHOLDER}, with 3 to 5 lessons, in the category from curriculum/categories.json that fits best. ${REQUIREMENTS_TEXT}`
} as const;

export const ADD_TOPIC_STEPS = [
  `Fork the course on GitHub, then clone your fork (${REPOSITORY_URL})`,
  "Create a branch for your topic: git switch -c add-your-topic",
  "Open the folder in Claude Code, Codex, Cursor or Copilot",
  "Paste the prompt below, with your topic in place of <topic>",
  "The agent researches how to teach the topic, writes the lessons, exercises and tests, and runs the checks until they pass",
  "The agent commits, pushes the branch and opens a pull request against the original repository (gh pr create)",
  "Run pnpm start to study the new topic while the pull request is reviewed"
] as const;

export function addTopicPrompt({ agent, topic }: {
  agent: keyof typeof ADD_TOPIC_PROMPTS;
  topic: string;
}) {
  return ADD_TOPIC_PROMPTS[agent].replace(TOPIC_PLACEHOLDER, topic.trim() || TOPIC_PLACEHOLDER);
}
