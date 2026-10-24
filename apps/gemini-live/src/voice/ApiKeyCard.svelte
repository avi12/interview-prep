<script lang="ts">
  import { removeApiKey, saveApiKey } from "./server-api.ts";
  import { Engine, ENGINE_DETAIL } from "@/lib/engine.ts";
  import {
    API_KEY_CREATE_URL,
    API_KEY_ENV,
    API_PRICING_URL,
    type ApiKeyResponse,
    ApiKeySource,
    apiKeyUpdateSchema
  } from "@scripts/lib/voice.ts";

  const SAVE_FAILED_TEXT = "Could not save the key. Is the trainer still running?";
  const REMOVE_FAILED_TEXT = "Could not remove the key. Is the trainer still running?";
  const UNREACHABLE_TEXT = "Could not reach the trainer's VS Code extension. Start the trainer with pnpm start, then reload this page.";

  const { apiKey, isLoaded, onchange }: {
    apiKey: ApiKeyResponse | null;
    isLoaded: boolean;
    onchange: () => Promise<void>;
  } = $props();

  let draft = $state("");
  let isEditing = $state(false);
  let error = $state("");

  const isDraftValid = $derived(apiKeyUpdateSchema.safeParse({ key: draft }).success);
  const isFormShown = $derived.by(() => {
    if (!apiKey) {
      return false;
    }

    return apiKey.source === ApiKeySource.NONE || isEditing;
  });

  async function save() {
    const parsed = apiKeyUpdateSchema.safeParse({ key: draft });
    if (!parsed.success) {
      return;
    }

    if (!(await saveApiKey(parsed.data))) {
      error = SAVE_FAILED_TEXT;
      return;
    }

    draft = "";
    error = "";
    isEditing = false;
    await onchange();
  }
</script>

<section class="card" aria-labelledby="key-title">
  <h2 id="key-title" class="card-head">Gemini API key</h2>
  <p class="sub">{ENGINE_DETAIL[Engine.API_KEY]}</p>

  {#if !isLoaded}
    <p class="sub">Checking for a saved key</p>
  {:else if !apiKey}
    <p class="callout" data-kind="danger">{UNREACHABLE_TEXT}</p>
  {:else if isFormShown}
    <form
      onsubmit={e => {
        e.preventDefault();
        void save();
      }}
    >
      <label class="field">
        <span class="sub">Paste your key</span>
        <input
          autocomplete="off"
          spellcheck="false"
          type="password"
          bind:value={draft}
        />
      </label>
      <div class="actions">
        <button class="btn" data-variant="primary" disabled={!isDraftValid} type="submit">Save</button>
        {#if isEditing}
          <button
            class="btn"
            onclick={() => {
              isEditing = false;
              draft = "";
            }}
            type="button"
          >
            Cancel
          </button>
        {/if}
      </div>
    </form>
    <p>
      <a href={API_KEY_CREATE_URL} rel="noreferrer" target="_blank">Create a free key in Google AI Studio</a>
    </p>
    <p class="sub">
      The free tier works with lower limits. With billing turned on, usage is charged to your
      Google Cloud account, see <a href={API_PRICING_URL} rel="noreferrer" target="_blank">Gemini API pricing</a>.
    </p>
  {:else if apiKey.source === ApiKeySource.ENV}
    <p><span class="chip" data-tone="ok">From {API_KEY_ENV}</span></p>
    <p class="sub">
      The key comes from the {API_KEY_ENV} environment variable. Change it there and restart the trainer.
    </p>
  {:else}
    <p><span class="chip" data-tone="ok">Key saved</span></p>
    <div class="actions">
      <button class="btn" onclick={() => (isEditing = true)} type="button">Change</button>
      <button
        class="btn"
        data-variant="danger"
        onclick={async () => {
          if (!(await removeApiKey())) {
            error = REMOVE_FAILED_TEXT;
            return;
          }

          error = "";
          await onchange();
        }}
        type="button"
      >
        Remove
      </button>
    </div>
  {/if}

  {#if error}
    <p class="callout" data-kind="danger" role="alert">{error}</p>
  {/if}
</section>

<style>
  form {
    display: grid;
    gap: var(--s-3);
  }

  .field {
    display: grid;
    gap: var(--s-1);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
</style>
