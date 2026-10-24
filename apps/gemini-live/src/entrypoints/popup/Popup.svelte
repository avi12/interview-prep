<script lang="ts">
  import MicKey from "./MicKey.svelte";
  import { Engine, ENGINE_DETAIL, ENGINE_LABEL } from "@/lib/engine.ts";
  import { type Language, LANGUAGE_LABEL, languageSchema } from "@/lib/language.ts";
  import { isRunning } from "@/lib/live-state.ts";
  import { sessionText, sessionTone } from "@/lib/live-status.ts";
  import { watchMicKeyHint } from "@/lib/mic-key-hint.ts";
  import { parseSession, type Session } from "@/lib/session-schema.ts";
  import { sessionItem } from "@/lib/session.ts";
  import { loadEngine, loadLanguage, saveEngine, saveLanguage } from "@/lib/settings.ts";
  import { VOICE_URL } from "@/lib/voice-page.ts";
  import { findVscodeTab, VSCODE_ORIGIN } from "@/lib/vscode.ts";
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";

  const IDLE = "idle";
  const READY_TEXT = "Start the voice tutor from the VS Code title bar";
  const NEEDS_VSCODE_TEXT = `Open VS Code at ${VSCODE_ORIGIN} to begin`;
  const NEXT_SESSION_TEXT = "Applies to the next session";
  const SWITCH_LOCKED_TEXT = "Stop the voice tutor to switch";
  const TAB_EVENTS = [browser.tabs.onCreated, browser.tabs.onRemoved, browser.tabs.onUpdated];

  let session = $state<Session | null>(null);
  let isVscodeOpen = $state(false);
  let language = $state<Language>();
  let micKeyHint = $state("");
  let engine = $state<Engine>();

  const sessionState = $derived(session?.state ?? IDLE);
  const isLive = $derived(!!session && isRunning(session.state));
  const status = $derived.by(() => {
    if (session) {
      return sessionText({
        session,
        micKeyHint
      });
    }

    return isVscodeOpen ? READY_TEXT : NEEDS_VSCODE_TEXT;
  });

  async function refreshVscode() {
    isVscodeOpen = !!(await findVscodeTab());
  }

  function chooseLanguage(value: string) {
    const parsedLanguage = languageSchema.safeParse(value);
    if (parsedLanguage.success) {
      void saveLanguage(parsedLanguage.data);
    }
  }

  function chooseEngine(chosen: Engine) {
    if (isLive) {
      return;
    }

    engine = chosen;
    void saveEngine(chosen);
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
    void loadEngine().then(loaded => {
      engine = loaded;
    });
    void refreshVscode();
    const unwatchMicKey = watchMicKeyHint(hint => {
      micKeyHint = hint;
    });
    return () => {
      unwatch();
      unwatchMicKey();
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
  <fieldset class="field engine" disabled={isLive}>
    <legend class="sub">Voice engine</legend>
    {#each Object.values(Engine) as option (option)}
      <label class="option">
        <input
          name="engine"
          checked={engine === option}
          onchange={() => chooseEngine(option)}
          type="radio"
          value={option}
        />
        <span>{ENGINE_LABEL[option]}</span>
        <small class="sub" class:warning={option === Engine.SUBSCRIPTION}>{ENGINE_DETAIL[option]}</small>
      </label>
    {/each}
    {#if isLive}
      <small class="sub">{SWITCH_LOCKED_TEXT}</small>
    {:else}
      <small class="sub">{NEXT_SESSION_TEXT}</small>
    {/if}
  </fieldset>
  {#if engine === Engine.API_KEY}
    <button id="api-key" class="btn" onclick={() => browser.tabs.create({ url: VOICE_URL })} type="button">Set or change API key</button>
  {/if}
  <MicKey />
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
  }

  .field {
    display: grid;
    gap: var(--s-1);
  }

  .engine {
    margin: 0;
    padding: 0;
    border: 0;

    &:disabled {
      opacity: 45%;
    }
  }

  .option {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--s-1) var(--s-2);
    align-items: center;

    & small {
      grid-column: 2;
    }

    & .warning {
      color: var(--warn);
    }
  }
</style>
