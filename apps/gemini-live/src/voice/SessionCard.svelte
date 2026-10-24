<script lang="ts">
  import { appendCaption, type Caption, closeCaptions, Speaker } from "./captions.ts";
  import { captureFromExtension, reportToExtension } from "./extension.ts";
  import { storeLanguage } from "./language-choice.ts";
  import { startTutorSession, type TutorSession } from "./tutor-session.ts";
  import {
    MIC_DENIED_TEXT,
    NO_KEY_TEXT,
    READY_TEXT,
    SETUP_REJECTED_TEXT,
    statusText,
    STOPPED_TEXT
  } from "./voice-status.ts";
  import { type Language, LANGUAGE_LABEL, languageSchema } from "@/lib/language.ts";
  import { type ScreenShare, startScreenShare } from "@/lib/live-api/screen-share.ts";
  import { isRunning, LiveState } from "@/lib/live-state.ts";
  import { liveStateLabel, liveStateTone, Tone } from "@/lib/live-status.ts";
  import { type VoiceHello, VoiceMessage, voiceMessenger } from "@/lib/voice-channel.ts";
  import { onMount } from "svelte";

  const IDLE_LABEL = "Idle";
  const MIC_DENIED_ERROR = "NotAllowedError";
  const SPEAKER_LABEL: Record<Speaker, string> = {
    [Speaker.LEARNER]: "You",
    [Speaker.TUTOR]: "Tutor"
  };

  let { apiKey, hello, language = $bindable() }: {
    apiKey: string;
    hello: VoiceHello | null;
    language: Language;
  } = $props();

  let session = $state<TutorSession | null>(null);
  let liveState = $state<LiveState | null>(null);
  let detail = $state("");
  let isMicOpen = $state(true);
  let isSpeakerBlocked = $state(false);
  let captions = $state<Caption[]>([]);
  let share = $state<ScreenShare | null>(null);
  let hasAutostarted = false;

  const isExtension = $derived(hello !== null);
  const isActive = $derived(liveState !== null && isRunning(liveState));
  const canStart = $derived(apiKey !== "" && !isActive);
  const status = $derived.by(() => {
    if (liveState) {
      return statusText({
        state: liveState,
        detail,
        isMicOpen
      });
    }

    return apiKey ? READY_TEXT : NO_KEY_TEXT;
  });
  const chipLabel = $derived.by(() => {
    if (liveState) {
      return liveStateLabel(liveState);
    }

    return IDLE_LABEL;
  });
  const chipTone = $derived.by(() => {
    if (liveState) {
      return liveStateTone(liveState);
    }

    return Tone.IDLE;
  });

  function failureText(error: unknown) {
    if (error instanceof DOMException && error.name === MIC_DENIED_ERROR) {
      return MIC_DENIED_TEXT;
    }

    return error instanceof Error ? error.message : String(error);
  }

  function captureFrame() {
    if (isExtension) {
      return captureFromExtension();
    }

    return share?.grab() ?? Promise.resolve(null);
  }

  async function start() {
    if (!canStart) {
      return;
    }

    captions = [];
    detail = "";
    isMicOpen = true;
    session = await startTutorSession({
      apiKey,
      language,
      captureFrame,
      events: {
        onState(state) {
          liveState = state;
        },
        onCaption({ speaker, text }) {
          captions = appendCaption({
            captions,
            speaker,
            text
          });
        },
        onTurnComplete() {
          captions = closeCaptions(captions);
        },
        onSpeakerBlocked(isBlocked) {
          isSpeakerBlocked = isBlocked;
        },
        onClosed({ reason, isSetupRejected }) {
          session = null;
          isSpeakerBlocked = false;
          liveState = LiveState.FAILED;
          detail = isSetupRejected ? `${SETUP_REJECTED_TEXT} (${reason})` : reason;
        }
      }
    }).catch((error: unknown) => {
      liveState = LiveState.FAILED;
      detail = failureText(error);
      return null;
    });
  }

  function stop() {
    if (!session) {
      return;
    }

    session.stop();
    session = null;
    liveState = LiveState.FAILED;
    detail = STOPPED_TEXT;
  }

  function toggleMic() {
    if (!session) {
      return;
    }

    isMicOpen = !isMicOpen;
    session.setMicOpen(isMicOpen);
  }

  $effect(() => {
    if (!isExtension || !liveState) {
      return;
    }

    reportToExtension({
      state: liveState,
      detail: status,
      isMicOpen
    });
  });

  $effect(() => {
    if (!hello?.isAutostart || !apiKey || hasAutostarted) {
      return;
    }

    hasAutostarted = true;
    void start();
  });

  onMount(() => {
    const removeStop = voiceMessenger.onMessage(VoiceMessage.STOP, () => stop());
    const removeMicToggle = voiceMessenger.onMessage(VoiceMessage.MIC_TOGGLE, () => toggleMic());
    return () => {
      removeStop();
      removeMicToggle();
      session?.stop();
      share?.stop();
    };
  });
</script>

<section class="card" aria-labelledby="session-title">
  <header>
    <h2 id="session-title" class="card-head">Voice tutor</h2>
    <span class="chip" data-tone={chipTone}>{chipLabel}</span>
  </header>
  <output aria-live="polite">{status}</output>
  {#if isSpeakerBlocked && session}
    <button class="btn" data-variant="primary" onclick={() => session?.unblockSpeaker()} type="button">
      Click to hear your tutor
    </button>
  {/if}

  <div class="controls">
    <label class="field">
      <span class="sub">Tutor language</span>
      <select
        disabled={isActive}
        onchange={e => {
          const parsed = languageSchema.safeParse(e.currentTarget.value);
          if (parsed.success) {
            language = parsed.data;
            storeLanguage(parsed.data);
          }
        }}
        value={language}
      >
        {#each Object.entries(LANGUAGE_LABEL) as [value, label] (value)}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>
    <div class="actions">
      {#if isActive}
        <button class="btn" data-variant="danger" disabled={!session} onclick={stop} type="button">Stop</button>
        <button class="btn" disabled={!session} onclick={toggleMic} type="button">
          {#if isMicOpen}
            Mute
          {:else}
            Unmute
          {/if}
        </button>
      {:else}
        <button
          class="btn"
          data-variant="primary"
          disabled={!canStart}
          onclick={() => void start()}
          type="button"
        >
          Start
        </button>
      {/if}
      <span class="without-extension">
        {#if share}
          <button
            class="btn"
            onclick={() => {
              share?.stop();
              share = null;
            }}
            type="button"
          >
            Stop sharing
          </button>
        {:else}
          <button
            class="btn"
            onclick={async () => {
              share = await startScreenShare(() => {
                share = null;
              }).catch(() => null);
            }}
            type="button"
          >
            Share VS Code tab
          </button>
        {/if}
      </span>
    </div>
  </div>
  <p class="sub without-extension">
    Sharing is optional: the tutor already reads the lesson, your file and your last test run as text.
    A picture helps it see where you are looking.
  </p>
  <p class="sub with-extension">The extension sends the tutor a picture of your VS Code tab about once a second.</p>

  {#if captions.length > 0}
    <ol class="captions" aria-label="Live captions">
      {#each captions as caption, iCaption (iCaption)}
        <li data-speaker={caption.speaker}>
          <span class="sub">{SPEAKER_LABEL[caption.speaker]}</span>
          <span>{caption.text}</span>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  header {
    display: flex;
    gap: var(--s-3);
    justify-content: space-between;
    align-items: baseline;

    & .card-head {
      flex: 1;
    }
  }

  output {
    display: block;
    font: var(--t-body-l);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-4);
    align-items: end;
    margin-top: var(--s-4);
  }

  .field {
    display: grid;
    gap: var(--s-1);
  }

  .actions,
  .actions > span {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .captions {
    display: grid;
    gap: var(--s-2);
    margin: 0;
    margin-top: var(--s-4);
    padding: var(--s-3);
    border: 2px solid var(--border);
    background: var(--surface-2);
    list-style: none;

    & li {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: var(--s-2);
    }

    & [data-speaker="learner"] span:last-child {
      color: var(--fg-muted);
    }
  }
</style>
