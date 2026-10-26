<script lang="ts">
  import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
  import { isRunning } from "@/lib/live-state.ts";
  import { sessionLabel, sessionText, sessionTone, Tone } from "@/lib/live-status.ts";
  import { watchMicKeyHint } from "@/lib/mic-key-hint.ts";
  import { parseSession, type Session } from "@/lib/session-schema.ts";
  import { sessionItem } from "@/lib/session.ts";
  import { TutorAction } from "@/lib/tutor-action.ts";
  import { onMount } from "svelte";

  const START_LABEL = "Start voice tutor";
  const STOP_LABEL = "Stop";
  const STOP_TITLE = "Stop the voice tutor";
  const MIC_OPEN_LABEL = "Mic on";
  const MIC_MUTED_LABEL = "Muted";
  const MIC_OPEN_TITLE = "Gemini hears you.";
  const MIC_MUTED_TITLE = "Gemini can't hear you.";
  const MUTE_ACTION = "mute";
  const TALK_ACTION = "talk";

  let session = $state<Session | null>(null);
  let failure = $state("");
  let micKeyHint = $state("");

  const isLive = $derived(!!session && isRunning(session.state));
  const tone = $derived(failure ? Tone.DANGER : sessionTone(session));
  const label = $derived(failure || (session ? sessionLabel(session) : ""));
  const title = $derived(
    failure || (session ? sessionText({
      session,
      micKeyHint
    }) : "")
  );
  const isMicOpen = $derived(!!session?.isMicOpen);
  const micLabel = $derived(isMicOpen ? MIC_OPEN_LABEL : MIC_MUTED_LABEL);
  const micTitle = $derived(`${isMicOpen ? MIC_OPEN_TITLE : MIC_MUTED_TITLE} ${pressOrClick(isMicOpen ? MUTE_ACTION : TALK_ACTION)}`);

  function pressOrClick(action: string) {
    return micKeyHint ? `Press ${micKeyHint} or click to ${action}` : `Click to ${action}`;
  }

  function toggleMic() {
    void extensionMessenger.sendMessage(ExtensionMessage.MIC_TOGGLE).catch(() => {});
  }

  function show(raw: unknown) {
    session = parseSession(raw);
    failure = "";
  }

  function stop() {
    void extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP).catch(() => {});
  }

  async function start() {
    const result = await extensionMessenger
      .sendMessage(ExtensionMessage.LIVE_START)
      .catch((error: Error) => ({
        isStarted: false,
        detail: error.message
      }));
    failure = result.isStarted ? "" : result.detail;
  }

  onMount(() => {
    void sessionItem.getValue().then(show);
    const unwatchSession = sessionItem.watch(show);
    const unwatchMicKey = watchMicKeyHint(hint => {
      micKeyHint = hint;
    });
    return () => {
      unwatchSession();
      unwatchMicKey();
    };
  });
</script>

<div class="ip-tutor-panel" data-tone={tone} {title}>
  {#if label}
    <span class="ip-tutor-status">{label}</span>
  {/if}
  {#if isLive}
    <button
      class="ip-tutor ip-tutor-mic"
      aria-pressed={isMicOpen}
      data-open={isMicOpen}
      onclick={toggleMic}
      title={micTitle}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="8" rx="2" width="5" x="5.5" y="1.5" />
        <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" />
        {#if !isMicOpen}
          <path d="M2 2l12 12" />
        {/if}
      </svg>
      {micLabel}
      {#if micKeyHint}
        <kbd>{micKeyHint}</kbd>
      {/if}
    </button>
  {:else}
    <button class="ip-tutor" data-tutor-action={TutorAction.START} onclick={start} type="button">{START_LABEL}</button>
  {/if}
  {#if session}
    <button
      class="ip-tutor ip-tutor-secondary"
      data-tutor-action={TutorAction.STOP}
      onclick={stop}
      title={STOP_TITLE}
      type="button"
    >
      {STOP_LABEL}
    </button>
  {/if}
</div>

<style>
  .ip-tutor-panel {
    --tone: var(--vscode-disabledForeground, #808080);

    position: relative;
    z-index: 1;
    display: flex;
    flex: none;
    gap: 8px;
    align-items: center;
    max-width: min(520px, 40vw);
    height: 26px;
    margin-inline: 8px;
    color: var(--vscode-titleBar-activeForeground, canvastext);
    font: 12px var(--vscode-font-family, system-ui);

    &::before {
      content: "";
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--tone);
    }

    &[data-tone="ok"] {
      --tone: var(--vscode-testing-iconPassed, #388a34);
    }

    &[data-tone="warn"] {
      --tone: var(--vscode-editorWarning-foreground, #cca700);
    }

    &[data-tone="danger"] {
      --tone: var(--vscode-editorError-foreground, #f14c4c);
    }

    &:global(:is(body > *)) {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 2147483000;
    }
  }

  .ip-tutor-status {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ip-tutor {
    --button-background: var(--vscode-button-background, transparent);
    --button-hover-background: var(--vscode-button-hoverBackground, var(--button-background));
    --button-foreground: var(--vscode-button-foreground, var(--vscode-foreground, canvastext));

    flex: none;
    height: 24px;
    padding: 0 12px;
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 2px;
    background: var(--button-background);
    color: var(--button-foreground);
    font: 600 12px var(--vscode-font-family, system-ui);
    cursor: pointer;

    &:hover {
      background: var(--button-hover-background);
      outline: 1px dashed var(--vscode-contrastActiveBorder, transparent);
      outline-offset: -1px;
    }
  }

  .ip-tutor-secondary,
  .ip-tutor-mic {
    --button-background: var(--vscode-button-secondaryBackground, transparent);
    --button-hover-background: var(--vscode-button-secondaryHoverBackground, var(--button-background));
    --button-foreground: var(--vscode-button-secondaryForeground, var(--vscode-foreground, canvastext));
  }

  .ip-tutor-mic {
    display: inline-flex;
    gap: 6px;
    align-items: center;

    &[data-open="true"] {
      background: var(--vscode-statusBarItem-errorBackground, #c72e0f);
      color: var(--vscode-statusBarItem-errorForeground, #ffffff);
      animation: ip-tutor-on-air 1600ms ease-out infinite;
    }

    & svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 1.5;
    }

    & kbd {
      padding-inline: 4px;
      border: 1px solid currentColor;
      border-radius: 3px;
      font: 10px var(--vscode-editor-font-family, monospace);
      opacity: 75%;
    }
  }

  @keyframes ip-tutor-on-air {
    from {
      box-shadow: 0 0 0 0 var(--vscode-statusBarItem-errorBackground, #c72e0f);
    }

    to {
      box-shadow: 0 0 0 6px transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ip-tutor-mic[data-open="true"] {
      animation: none;
    }
  }
</style>
