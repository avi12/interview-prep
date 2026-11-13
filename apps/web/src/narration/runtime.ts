import { voicesSchema } from "#scripts/lib/edge-tts/voice.ts";
import { NARRATE_STREAM_PATH, NARRATE_VOICES_PATH, NarrateQuery } from "#scripts/lib/narration-stream.ts";
import { reachedCueNames } from "@/narration/cue-timing.ts";
import { streamNarration } from "@/narration/stream-player.ts";

const NARRATED_CARD_SELECTOR = "[data-narrate]";
const LESSON_SELECTOR = "[data-lesson]";
const CARD_HEAD_SELECTOR = ".card-head";
const CARD_ID_PREFIX = "card-";
const NARRATING_ATTRIBUTE = "data-narrating";
const CUE_REACHED_ATTRIBUTE = "data-cue-reached";
const BUTTON_CLASS = "narrate-button";
const PICKER_CLASS = "narrate-voice";
const VOICE_STORAGE_KEY = "interviewPrep.narrationVoice";
const AUTO_VOICE = "";
const BUTTON_LABEL = "Narrate this card";
const VOICE_LABEL = "Narration voice";
const AUTO_VOICE_LABEL = "Automatic voice";
const PRESSED_ATTRIBUTE = "aria-pressed";

interface ActiveNarration {
  card: HTMLElement;
  controller: AbortController;
  stream: ReturnType<typeof streamNarration>;
  frameRequest: number;
}

let active: ActiveNarration | null = null;

function runtimeOrigin() {
  const { currentScript } = document;
  if (!(currentScript instanceof HTMLScriptElement)) {
    return null;
  }

  return new URL(currentScript.src).origin;
}

function readStoredVoice() {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) ?? AUTO_VOICE;
  } catch {
    return AUTO_VOICE;
  }
}

function storeVoice(voice: string) {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  } catch {
    return;
  }
}

function streamUrl({
  origin,
  lessonId,
  cardNumber,
  voice
}: {
  origin: string;
  lessonId: string;
  cardNumber: number;
  voice: string;
}) {
  const url = new URL(NARRATE_STREAM_PATH, origin);
  url.searchParams.set(NarrateQuery.LESSON, lessonId);
  url.searchParams.set(NarrateQuery.CARD, String(cardNumber));

  if (voice !== AUTO_VOICE) {
    url.searchParams.set(NarrateQuery.VOICE, voice);
  }

  return url;
}

function clearCard(card: HTMLElement) {
  card.removeAttribute(NARRATING_ATTRIBUTE);
  for (const elCue of card.querySelectorAll(`[${CUE_REACHED_ATTRIBUTE}]`)) {
    elCue.removeAttribute(CUE_REACHED_ATTRIBUTE);
  }

  card.querySelector(`.${BUTTON_CLASS}`)?.setAttribute(PRESSED_ATTRIBUTE, "false");
}

function stopActive() {
  if (active === null) {
    return;
  }

  cancelAnimationFrame(active.frameRequest);
  active.controller.abort();
  active.stream.stop();
  clearCard(active.card);
  active = null;
}

async function follow({ session }: { session: ActiveNarration }) {
  const meta = await session.stream.metaReady;
  function tick() {
    if (active !== session) {
      return;
    }

    for (const name of reachedCueNames({
      cues: meta.cues,
      words: session.stream.words,
      seconds: session.stream.audio.currentTime
    })) {
      for (const elCue of session.card.querySelectorAll(`[data-cue="${CSS.escape(name)}"]`)) {
        elCue.setAttribute(CUE_REACHED_ATTRIBUTE, "");
      }
    }

    session.frameRequest = requestAnimationFrame(tick);
  }

  tick();
}

function play({
  card,
  origin,
  lessonId,
  cardNumber,
  voice
}: {
  card: HTMLElement;
  origin: string;
  lessonId: string;
  cardNumber: number;
  voice: string;
}) {
  stopActive();
  const controller = new AbortController();
  const stream = streamNarration({
    url: streamUrl({
      origin,
      lessonId,
      cardNumber,
      voice
    }),
    signal: controller.signal
  });
  const session: ActiveNarration = {
    card,
    controller,
    stream,
    frameRequest: 0
  };
  active = session;
  card.setAttribute(NARRATING_ATTRIBUTE, "");
  card.querySelector(`.${BUTTON_CLASS}`)?.setAttribute(PRESSED_ATTRIBUTE, "true");
  void stream.audio.play().catch(() => undefined);
  stream.audio.addEventListener("ended", () => {
    if (active === session) {
      stopActive();
    }
  });
  stream.finished.catch(() => {
    const isStalled = active === session && stream.audio.paused;
    if (isStalled) {
      stopActive();
    }
  });
  void follow({ session });
}

function addButton({ card, onToggle }: { card: HTMLElement; onToggle: () => void }) {
  const elButton = document.createElement("button");
  elButton.type = "button";
  elButton.className = BUTTON_CLASS;
  elButton.setAttribute(PRESSED_ATTRIBUTE, "false");
  elButton.setAttribute("aria-label", BUTTON_LABEL);
  elButton.title = BUTTON_LABEL;
  elButton.addEventListener("click", onToggle);
  card.querySelector(CARD_HEAD_SELECTOR)?.append(elButton);
}

async function addVoicePicker({ origin, elParent }: { origin: string; elParent: HTMLElement }) {
  const response = await fetch(new URL(NARRATE_VOICES_PATH, origin));
  const parsed = voicesSchema.safeParse(await response.json());
  if (!parsed.success) {
    return;
  }

  const elPicker = document.createElement("select");
  elPicker.className = PICKER_CLASS;
  elPicker.setAttribute("aria-label", VOICE_LABEL);
  elPicker.append(new Option(AUTO_VOICE_LABEL, AUTO_VOICE));
  for (const voice of parsed.data) {
    elPicker.append(new Option(`${voice.FriendlyName} (${voice.LocaleName})`, voice.ShortName));
  }

  elPicker.value = readStoredVoice();
  elPicker.addEventListener("change", event => {
    if (event.target instanceof HTMLSelectElement) {
      storeVoice(event.target.value);
    }
  });
  elParent.append(elPicker);
}

function start() {
  const origin = runtimeOrigin();
  const lessonId = document.querySelector<HTMLElement>(LESSON_SELECTOR)?.dataset.lesson;
  if (origin === null || lessonId === undefined) {
    return;
  }

  for (const card of document.querySelectorAll<HTMLElement>(NARRATED_CARD_SELECTOR)) {
    const cardNumber = Number(card.id.slice(CARD_ID_PREFIX.length));
    addButton({
      card,
      onToggle() {
        if (card.hasAttribute(NARRATING_ATTRIBUTE)) {
          stopActive();
          return;
        }

        play({
          card,
          origin,
          lessonId,
          cardNumber,
          voice: readStoredVoice()
        });
      }
    });
  }

  const elHead = document.querySelector<HTMLElement>(".lesson-head");
  if (elHead !== null) {
    void addVoicePicker({
      origin,
      elParent: elHead
    }).catch(() => undefined);
  }
}

start();
