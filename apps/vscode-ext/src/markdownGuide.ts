import * as vscode from "vscode";

const MARKDOWN_PREVIEW_COMMAND = "markdown.showPreview";
const MARKDOWN_LANGUAGE = "markdown";
const IS_INTERNAL_COMMAND_LISTED = true;

export async function showMarkdownGuide(content: string) {
  const document = await vscode.workspace.openTextDocument({
    content,
    language: MARKDOWN_LANGUAGE
  });
  const commands = await vscode.commands.getCommands(IS_INTERNAL_COMMAND_LISTED);
  if (!commands.includes(MARKDOWN_PREVIEW_COMMAND)) {
    await vscode.window.showTextDocument(document);
    return;
  }

  await vscode.commands.executeCommand(MARKDOWN_PREVIEW_COMMAND, document.uri);
}
