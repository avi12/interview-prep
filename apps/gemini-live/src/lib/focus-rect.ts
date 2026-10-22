import type { FocusRect } from "./extension-channel.ts";

const ACTIVE_EDITOR_GROUP = ".editor-group-container.active";
const CODE_EDITOR = ".monaco-editor";
const CODE_LINE = ".view-line";
const CURSOR = ".cursors-layer .cursor";
const LINES_AROUND_CURSOR = 12;
const PADDING_PX = 16;
const MIN_WIDTH_PX = 480;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function toFocusRect({ left, top, right, bottom }: Box): FocusRect {
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    viewportWidth: window.innerWidth
  };
}

function measureLine(line: Element) {
  return {
    box: line.getBoundingClientRect(),
    textRight: (line.firstElementChild ?? line).getBoundingClientRect().right
  };
}

function codeBox(editor: Element): Box | null {
  const lines = [...editor.querySelectorAll(CODE_LINE)].map(measureLine);
  const [first] = lines;
  if (!first) {
    return null;
  }

  const editorBox = editor.getBoundingClientRect();
  const anchor = editor.querySelector(CURSOR)?.getBoundingClientRect().top ?? editorBox.top;
  const reach = first.box.height * LINES_AROUND_CURSOR;
  const near = lines.filter(({ box }) =>
    Math.abs(box.top - anchor) <= reach && box.bottom > editorBox.top && box.top < editorBox.bottom);
  if (near.length === 0) {
    return null;
  }

  return {
    left: editorBox.left,
    top: Math.max(editorBox.top, Math.min(...near.map(({ box }) => box.top)) - PADDING_PX),
    right: Math.min(
      editorBox.right,
      Math.max(editorBox.left + MIN_WIDTH_PX, ...near.map(({ textRight }) => textRight + PADDING_PX))
    ),
    bottom: Math.min(editorBox.bottom, Math.max(...near.map(({ box }) => box.bottom)) + PADDING_PX)
  };
}

export function focusRect(): FocusRect | null {
  const group = document.querySelector(ACTIVE_EDITOR_GROUP);
  if (!group) {
    return null;
  }

  const editor = group.querySelector(CODE_EDITOR);
  const code = editor ? codeBox(editor) : null;
  return toFocusRect(code ?? group.getBoundingClientRect());
}
