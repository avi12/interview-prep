const CUE_MARKER = /\[\[([\w-]+)\]\]/g;
const WHITESPACE_RUN = /\s+/g;
const SPACE = " ";

interface Cue {
  name: string;
  start: number;
}

function appendSpokenPart({ spoken, part }: { spoken: string; part: string }) {
  const normalized = part.replace(WHITESPACE_RUN, SPACE);
  const isDoubleSpace = spoken.endsWith(SPACE) && normalized.startsWith(SPACE);
  const isLeadingSpace = spoken === "" && normalized.startsWith(SPACE);
  return spoken + (isDoubleSpace || isLeadingSpace ? normalized.slice(1) : normalized);
}

export function parseNarrationScript(script: string) {
  const cues: Cue[] = [];
  let spoken = "";
  let iPartStart = 0;
  for (const match of script.matchAll(CUE_MARKER)) {
    spoken = appendSpokenPart({
      spoken,
      part: script.slice(iPartStart, match.index)
    });
    cues.push({
      name: match[1] ?? "",
      start: spoken.length
    });
    iPartStart = match.index + match[0].length;
  }

  spoken = appendSpokenPart({
    spoken,
    part: script.slice(iPartStart)
  });
  return {
    text: spoken.trimEnd(),
    cues
  };
}
