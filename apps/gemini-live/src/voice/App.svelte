<script lang="ts">
  import ApiKeyCard from "./ApiKeyCard.svelte";
  import { greetExtension } from "./extension.ts";
  import { loadStoredLanguage } from "./language-choice.ts";
  import { loadApiKey, loadVoiceSetup } from "./server-api.ts";
  import SessionCard from "./SessionCard.svelte";
  import SubscriptionCard from "./SubscriptionCard.svelte";
  import type { VoiceHello } from "@/lib/voice-channel.ts";
  import type { ApiKeyResponse, VoiceSetup } from "@scripts/lib/voice.ts";
  import { onMount } from "svelte";

  let apiKey = $state<ApiKeyResponse | null>(null);
  let isKeyLoaded = $state(false);
  let setup = $state<VoiceSetup | null>(null);
  let hello = $state<VoiceHello | null>(null);
  let isGreeted = $state(false);
  let language = $state(loadStoredLanguage());

  async function refreshKey() {
    apiKey = await loadApiKey();
    isKeyLoaded = true;
  }

  onMount(() => {
    void refreshKey();
    void loadVoiceSetup().then(loaded => {
      setup = loaded;
    });
    void greetExtension().then(greeting => {
      hello = greeting;
      language = greeting?.language ?? language;
      isGreeted = true;
    });
  });
</script>

<main>
  <header>
    <h1>Voice tutor</h1>
    <p class="sub">
      Talk through the lesson with Gemini Live. It reads the lesson, your file and your last test run while you work.
    </p>
  </header>
  <ApiKeyCard {apiKey} isLoaded={isKeyLoaded} onchange={refreshKey} />
  {#if isGreeted}
    <SessionCard apiKey={apiKey?.key ?? ""} {hello} bind:language />
  {/if}
  <SubscriptionCard {setup} />
</main>

<style>
  main {
    display: grid;
    gap: var(--s-5);
    max-width: 760px;
    margin: 0 auto;
    padding: var(--s-6) var(--s-4);
  }

  h1 {
    margin: 0;
  }

  header p {
    margin: 0;
    margin-top: var(--s-2);
  }
</style>
