<script lang="ts">
  import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
  import { type Language, LANGUAGE_LABEL, languageSchema } from "@/lib/language.ts";
  import { isRunning } from "@/lib/live-state.ts";
  import { sessionText, sessionTone } from "@/lib/live-status.ts";
  import { hasMicKey, MIC_KEY_LABEL, requestMicKey } from "@/lib/mic-key.ts";
  import { parseSession, type Session, sessionItem } from "@/lib/session.ts";
  import { loadLanguage, saveLanguage } from "@/lib/settings.ts";
  import { findVscodeTab, VSCODE_ORIGIN } from "@/lib/vscode.ts";
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";

  const IDLE = "idle";
  const READY_TEXT = "Ready when you are";
  const NEEDS_VSCODE_TEXT = `Open VS Code at ${VSCODE_ORIGIN} to begin`;
  const CONNECT_MIC_KEY_TEXT = `Connect the ${MIC_KEY_LABEL} key`;
  const MIC_KEY_CONNECTED_TEXT = `${MIC_KEY_LABEL} toggles your mic`;
  const MIC_KEY_HINT_TEXT = "Pick the ROCCAT keyboard in the list Chrome shows";
  const TAB_EVENTS = [browser.tabs.onCreated, browser.tabs.onRemoved, browser.tabs.onUpdated];

  let session = $state<Session | null>(null);
  let isVscodeOpen = $state(false);
  let isMicKeyConnected = $state(false);
  let language = $state<Language>();
  let note = $state("");

  const sessionState = $derived(session?.state ?? IDLE);
  const isSessionRunning = $derived(!!session && isRunning(session.state));
  const isStartable = $derived(isVscodeOpen && !isSessionRunning);
  const status = $derived.by(() => {
    if (session) {
      return sessionText(session);
    }

    return isVscodeOpen ? READY_TEXT : NEEDS_VSCODE_TEXT;
  });
  const micKeyText = $derived(isMicKeyConnected ? MIC_KEY_CONNECTED_TEXT : CONNECT_MIC_KEY_TEXT);

  async function refreshVscode() {
    isVscodeOpen = !!(await findVscodeTab());
  }

  async function start() {
    const result = await extensionMessenger
      .sendMessage(ExtensionMessage.LIVE_START)
      .catch((error: Error) => ({
        isStarted: false,
        detail: error.message
      }));
    note = result.isStarted ? "" : result.detail;
  }

  async function stop() {
    note = "";
    await extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP);
  }

  async function connectMicKey() {
    isMicKeyConnected = await requestMicKey().catch(() => false);

    if (isMicKeyConnected) {
      await extensionMessenger.sendMessage(ExtensionMessage.MIC_KEY_GRANTED);
    }
  }

  function chooseLanguage(value: string) {
    const parsedLanguage = languageSchema.safeParse(value);
    if (parsedLanguage.success) {
      void saveLanguage(parsedLanguage.data);
    }
  }

  onMount(() => {
    const unwatch = sessionItem.watch(raw => {
      session = parseSession(raw);
    });
    for (const event of TAB_EVENTS) {
      event.addListener(refreshVscode);
    }

    void sessionItem.getValue().then(raw => {
      session = parseSession(raw);
    });
    void loadLanguage().then(loaded => {
      language = loaded;
    });
    void hasMicKey().then(isConnected => {
      isMicKeyConnected = isConnected;
    });
    void refreshVscode();
    return () => {
      unwatch();
      for (const event of TAB_EVENTS) {
        event.removeListener(refreshVscode);
      }
    };
  });
</script>

<main data-state={sessionState}>
  <header>
    <h1>Gemini Live tutor</h1>
    <span id="chip" class="chip" data-tone={sessionTone(session)}>{sessionState}</span>
  </header>
  <section class="card">
    <output id="status">{status}</output>
    <p id="note" class="sub">{note}</p>
  </section>
  <label class="field">
    <span class="sub">Tutor language</span>
    <select id="language" onchange={e => chooseLanguage(e.currentTarget.value)} value={language}>
      {#each Object.entries(LANGUAGE_LABEL) as [value, label] (value)}
        <option {value}>{label}</option>
      {/each}
    </select>
    <small class="sub">Applies to the next session</small>
  </label>
  <div class="field">
    <span class="sub">Mic key</span>
    <button id="mic-key" class="btn" disabled={isMicKeyConnected} onclick={connectMicKey} type="button">{micKeyText}</button>
    {#if !isMicKeyConnected}
      <small class="sub">{MIC_KEY_HINT_TEXT}</small>
    {/if}
  </div>
  <footer>
    <button id="start" class="btn" data-variant="primary" disabled={!isStartable} onclick={start}>Start session</button>
    {#if session}
      <button id="stop" class="btn" data-variant="danger" onclick={stop}>Stop session</button>
    {/if}
  </footer>
</main>

<style>
  main {
    display: grid;
    gap: var(--s-4);
    padding: var(--s-4);
  }

  header {
    display: flex;
    gap: var(--s-3);
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font: var(--t-title-l);
  }

  .card {
    display: grid;
    gap: var(--s-2);
    padding: var(--s-4);

    & output {
      font: var(--t-body-l);
    }

    & p {
      min-height: 1.5em;
      margin: 0;
    }
  }

  .field {
    display: grid;
    gap: var(--s-1);

    & select {
      min-height: 36px;
      padding: 0 var(--s-3);
      border: 2px solid var(--border);
      background: var(--surface-2);
      color: var(--fg);
      font: var(--t-body-m);
    }
  }

  footer {
    display: flex;
    gap: var(--s-3);

    & .btn {
      flex: 1;
      justify-content: center;
    }
  }

  .btn:disabled {
    opacity: 45%;
    cursor: not-allowed;
  }

  .chip {
    &[data-tone="ok"] {
      border-color: var(--ok);
      color: var(--ok);
    }

    &[data-tone="warn"] {
      border-color: var(--warn);
      color: var(--warn);
    }

    &[data-tone="danger"] {
      border-color: var(--danger);
      color: var(--danger);
    }
  }
</style>
