<script lang="ts">
  import CopyLine from "./CopyLine.svelte";
  import { Engine, ENGINE_LABEL, SUBSCRIPTION_CONSEQUENCE, SUBSCRIPTION_RISK } from "@/lib/engine.ts";
  import { EXTENSION_BUILD_COMMAND, EXTENSION_BUILD_RELATIVE_DIR, type VoiceSetup } from "@scripts/lib/voice.ts";

  const EXTENSIONS_PAGE = "chrome://extensions";

  const { setup }: { setup: VoiceSetup | null } = $props();
</script>

<section class="card without-extension" aria-labelledby="subscription-title">
  <h2 id="subscription-title" class="card-head">Use your Gemini subscription instead</h2>
  <p class="callout" data-kind="warn">
    {SUBSCRIPTION_RISK} <strong>{SUBSCRIPTION_CONSEQUENCE}</strong>
    Your API key above is the official, public Live API.
  </p>
  <ol class="steps">
    <li>
      <span>Build the extension in a terminal at the repo root:</span>
      <CopyLine text={setup?.buildCommand ?? EXTENSION_BUILD_COMMAND} />
    </li>
    <li>
      <span>Open this address in a new tab (pages can't link to it), then turn on Developer mode:</span>
      <CopyLine text={EXTENSIONS_PAGE} />
    </li>
    <li>
      <span>Click Load unpacked and pick this folder:</span>
      <CopyLine text={setup?.extensionPath ?? EXTENSION_BUILD_RELATIVE_DIR} />
    </li>
    <li>Reload this page, then pick "{ENGINE_LABEL[Engine.SUBSCRIPTION]}" in the extension's popup.</li>
  </ol>
</section>

<p class="sub with-extension">
  The extension is installed.
  Choose "{ENGINE_LABEL[Engine.API_KEY]}" or "{ENGINE_LABEL[Engine.SUBSCRIPTION]}" in its popup.
</p>

<style>
  .steps {
    display: grid;
    gap: var(--s-3);
    margin: 0;
    margin-top: var(--s-4);
    padding-left: var(--s-5);

    & li {
      display: grid;
      gap: var(--s-1);
    }
  }
</style>
