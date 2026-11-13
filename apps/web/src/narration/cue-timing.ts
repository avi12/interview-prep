import type { NarrationMeta, NarrationWord } from "#scripts/lib/narration-stream.ts";

export function reachedCueNames({
  cues,
  words,
  seconds
}: {
  cues: NarrationMeta["cues"];
  words: readonly NarrationWord[];
  seconds: number;
}) {
  const reached: string[] = [];
  for (const cue of cues) {
    const firstWord = words.find(word => word.textStart >= cue.start);
    if (firstWord !== undefined && firstWord.offsetSeconds <= seconds) {
      reached.push(cue.name);
    }
  }

  return reached;
}
