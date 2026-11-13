import { type TutorBlock, TutorBlockKind, type TutorView } from "@scripts/lib/tutor-view.ts";

import { EditorKind, isAppName } from "./vscode-title.ts";

const HEADING_MARK = "## ";
const BLOCK_SEPARATOR = "\n\n";
const VIEW_INTRO = "Page content, current as of now. Do not reply to this message, it only keeps you up to date.";

function blockText({ kind, text }: TutorBlock) {
  return kind === TutorBlockKind.HEADING ? `${HEADING_MARK}${text}` : text;
}

export function tutorViewText(view: TutorView) {
  return [VIEW_INTRO, `# ${view.title}`, ...view.blocks.map(blockText)].join(BLOCK_SEPARATOR);
}

export function tutorViewContext(view: TutorView | null) {
  const title = view?.title.trim() ?? "";
  const isGenericTitle = !title || isAppName(title);
  if (isGenericTitle) {
    return null;
  }

  return {
    kind: EditorKind.LESSON,
    name: title
  };
}
