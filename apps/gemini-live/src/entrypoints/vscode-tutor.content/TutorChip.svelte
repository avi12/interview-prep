<script lang="ts">
  import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
  import { isRunning } from "@/lib/live-state.ts";
  import { sessionLabel, sessionText, sessionTone, Tone } from "@/lib/live-status.ts";
  import { MIC_KEY_LABEL } from "@/lib/mic-key.ts";
  import { parseSession, type Session } from "@/lib/session-schema.ts";
  import { sessionItem } from "@/lib/session.ts";
  import { onMount } from "svelte";

  const START_LABEL = "Start voice tutor";
  const STOP_LABEL = "Stop voice tutor";
  const MUTE_LABEL = "Mute";
  const TALK_LABEL = "Talk";
  const MIC_TITLE = `Mute or unmute your mic (${MIC_KEY_LABEL})`;

  let session = $state<Session | null>(null);
  let failure = $state("");

  const isLive = $derived(!!session && isRunning(session.state));
  const tone = $derived(failure ? Tone.DANGER : sessionTone(session));
  const label = $derived(failure || (session ? sessionLabel(session) : ""));
  const title = $derived(failure || (session ? sessionText(session) : ""));
  const toggleLabel = $derived(isLive ? STOP_LABEL : START_LABEL);
  const micLabel = $derived(session?.isMicOpen ? MUTE_LABEL : TALK_LABEL);

  function show(raw: unknown) {
    session = parseSession(raw);
    failure = "";
  }

  async function toggle() {
    if (isLive) {
      await extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP);
      return;
    }

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
    return sessionItem.watch(show);
  });
</script>

<div class="ip-tutor-panel" data-tone={tone} {title}>
  {#if label}
    <span class="ip-tutor-status">{label}</span>
  {/if}
  {#if isLive}
    <button
      class="ip-tutor ip-tutor-mic"
      onclick={() => void extensionMessenger.sendMessage(ExtensionMessage.MIC_TOGGLE).catch(() => {})}
      title={MIC_TITLE}
      type="button"
    >{micLabel}</button>
  {/if}
  <button class="ip-tutor" onclick={toggle} type="button">{toggleLabel}</button>
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
    flex: none;
    height: 24px;
    padding: 0 12px;
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 2px;
    background: var(--vscode-button-background, highlight);
    color: var(--vscode-button-foreground, highlighttext);
    font: 600 12px var(--vscode-font-family, system-ui);
    cursor: pointer;

    &:hover {
      background: var(--vscode-button-hoverBackground, highlight);
    }
  }

  .ip-tutor-mic {
    background: var(--vscode-button-secondaryBackground, buttonface);
    color: var(--vscode-button-secondaryForeground, buttontext);

    &:hover {
      background: var(--vscode-button-secondaryHoverBackground, buttonface);
    }
  }
</style>
