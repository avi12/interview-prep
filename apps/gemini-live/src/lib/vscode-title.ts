export const EditorKind = {
  FILE: "file",
  LESSON: "lesson"
} as const;
export type EditorKind = (typeof EditorKind)[keyof typeof EditorKind];

export type VscodeContext = { kind: EditorKind; name: string } | null;

const TITLE_SEPARATOR = " - ";
const DIRTY_MARK = /^[●•*]\s*/;
const APP_SEGMENT = /^(Visual Studio Code|VS Code|Insiders|code-server)$/i;
const FILE_NAME = /^\S+\.[A-Za-z0-9]{1,8}$/;
const MIN_SEGMENTS_WITH_EDITOR = 2;

export const parseVscodeTitle = (title: string): VscodeContext => {
  const segments = title.split(TITLE_SEPARATOR).map(segment => segment.trim());
  while (segments.length > 0 && APP_SEGMENT.test(segments.at(-1) ?? "")) segments.pop();
  if (segments.length < MIN_SEGMENTS_WITH_EDITOR) return null;
  const name = segments.slice(0, -1).join(TITLE_SEPARATOR).replace(DIRTY_MARK, "").trim();
  if (!name) return null;
  return { kind: FILE_NAME.test(name) ? EditorKind.FILE : EditorKind.LESSON, name };
};
