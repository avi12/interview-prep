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
  import { findVscodeTab, VSCODE_ORIGIN, VSCODE_SITES_TEXT } from "@/lib/vscode.ts";
  import { WEB_ORIGIN } from "@scripts/lib/gcp.ts";
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";

  const IDLE = "idle";
  const READY_TEXT = `Start the voice tutor from the title bar at ${VSCODE_ORIGIN} or the status bar at ${WEB_ORIGIN}`;
  const NEEDS_VSCODE_TEXT = `Open VS Code at ${VSCODE_SITES_TEXT} to begin`;
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
  <section class="plate" aria-labelledby="title">
    <h1 id="title" class="tab">Gemini Live tutor</h1>
    <span id="chip" class="tab alt" data-tone={sessionTone(session)}>{sessionState}</span>
    <output id="status" class="term">
      <span class="c-led" data-live={isLive || undefined}></span>
      {status}
    </output>
  </section>
  <section class="plate">
    <h2 class="tab">Language</h2>
    <label class="c-field">
      <span class="c-sr-only">Tutor language</span>
      <select id="language" onchange={e => chooseLanguage(e.currentTarget.value)} value={language}>
        {#each Object.entries(LANGUAGE_LABEL) as [value, label] (value)}
          <option {value}>{label}</option>
        {/each}
      </select>
      <small class="c-hint">Applies to the next session</small>
    </label>
  </section>
  <section class="plate">
    <h2 class="tab">Voice engine</h2>
    <fieldset class="engine" disabled={isLive}>
      <legend class="c-sr-only">Voice engine</legend>
      {#each Object.values(Engine) as option (option)}
        <label class="option">
          <input
            name="engine"
            class="c-radio"
            checked={engine === option}
            onchange={() => chooseEngine(option)}
            type="radio"
            value={option}
          />
          <span>{ENGINE_LABEL[option]}</span>
          <small class="c-hint" class:warning={option === Engine.SUBSCRIPTION}>{ENGINE_DETAIL[option]}</small>
        </label>
      {/each}
      {#if isLive}
        <small class="c-hint">{SWITCH_LOCKED_TEXT}</small>
      {:else}
        <small class="c-hint">{NEXT_SESSION_TEXT}</small>
      {/if}
    </fieldset>
    {#if engine === Engine.API_KEY}
      <button
        id="api-key"
        class="c-btn"
        data-variant="primary"
        onclick={() => browser.tabs.create({ url: VOICE_URL })}
        type="button"
      >
        Set or change API key
      </button>
    {/if}
  </section>
  <MicKey />
</main>

<style>
  main {
    display: grid;
    gap: var(--s-3);
    padding: var(--s-3);
  }

  h1,
  h2 {
    margin: 0;
  }

  .term {
    display: flex;
    gap: var(--s-2);
    align-items: center;
  }

  .engine {
    display: grid;
    gap: var(--s-3);
    margin: 0;
    padding: 0;
    border: 0;

    &:disabled {
      opacity: 0.45;
    }
  }

  .option {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--s-1) var(--s-2);
    align-items: center;
    cursor: pointer;

    & small {
      grid-column: 2;
    }

    & .warning {
      color: var(--warn);
    }
  }
</style>
