import { ADD_TOPIC_STEPS, addTopicPrompt } from "@scripts/lib/add-topic.ts";
import { REPOSITORY_URL } from "@scripts/lib/repository.ts";
import * as vscode from "vscode";

import { showMarkdownGuide } from "@/markdownGuide.ts";

function guideMarkdown(topic: string) {
  const steps = ADD_TOPIC_STEPS.map((step, iStep) => `${iStep + 1}. ${step}`).join("\n");
  return [
    "# Add a topic with a coding agent",
    "",
    `New topics are lessons in this course's source (${REPOSITORY_URL}). A coding agent writes them for you.`,
    "",
    steps,
    "",
    "## Prompt for Claude Code (copied to your clipboard)",
    "",
    "```",
    addTopicPrompt({
      agent: "claudeCode",
      topic
    }),
    "```",
    "",
    "## Prompt for any other agent",
    "",
    "```",
    addTopicPrompt({
      agent: "anyAgent",
      topic
    }),
    "```",
    ""
  ].join("\n");
}

export async function addTopic() {
  const topic = await vscode.window.showInputBox({
    prompt: "Which topic do you want to learn?",
    placeHolder: "for example: Docker basics, Linux permissions, React hooks"
  });
  if (topic === undefined) {
    return;
  }

  await vscode.env.clipboard.writeText(
    addTopicPrompt({
      agent: "claudeCode",
      topic
    })
  );
  await showMarkdownGuide(guideMarkdown(topic));
}
