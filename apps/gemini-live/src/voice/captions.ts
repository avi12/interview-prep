export const Speaker = {
  LEARNER: "learner",
  TUTOR: "tutor"
} as const;
export type Speaker = (typeof Speaker)[keyof typeof Speaker];

export interface Caption {
  speaker: Speaker;
  text: string;
  isOpen: boolean;
}

const MAX_CAPTIONS = 8;

export function appendCaption({ captions, speaker, text }: {
  captions: Caption[];
  speaker: Speaker;
  text: string;
}) {
  const last = captions.at(-1);
  if (last?.isOpen && last.speaker === speaker) {
    return [...captions.slice(0, -1), {
      ...last,
      text: last.text + text
    }];
  }

  const closed = captions.map(caption => ({
    ...caption,
    isOpen: false
  }));
  return [...closed, {
    speaker,
    text: text.trimStart(),
    isOpen: true
  }].slice(-MAX_CAPTIONS);
}

export function closeCaptions(captions: Caption[]) {
  return captions.map(caption => ({
    ...caption,
    isOpen: false
  }));
}
