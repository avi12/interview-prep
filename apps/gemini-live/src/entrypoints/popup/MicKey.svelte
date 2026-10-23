<script lang="ts">
  import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
  import { isModifierOnly, keyComboOf, keyComboProblem } from "@/lib/key-combo.ts";
  import {
    comboMicKey,
    DEFAULT_MIC_KEY,
    type MicKey,
    micKeyText,
    taughtOf,
    withLabel,
    withoutHeldKey
  } from "@/lib/mic-key-choice.ts";
  import { micKeyItem, parseMicKey, saveMicKey } from "@/lib/settings.ts";
  import { TeachRole } from "@/lib/taught-key.ts";
  import { onMount } from "svelte";

  const COMBO_SOURCE_TEXT = "Key combo, heard only while the VS Code page is focused";
  const TAUGHT_SOURCE_TEXT = "Taught from your keyboard by the key helper, heard while VS Code is in front";
  const RECORD_TEXT = "Press the combo now";
  const PRESS_TEXT: Record<TeachRole, string> = {
    [TeachRole.KEY]: "Press the key on its own",
    [TeachRole.HELD_KEY]: "Press the key you will hold, on its own"
  };
  const NAME_LABEL: Record<TeachRole, string> = {
    [TeachRole.KEY]: "Key name",
    [TeachRole.HELD_KEY]: "Held key name"
  };

  let micKey = $state<MicKey>(DEFAULT_MIC_KEY);
  let teachingRole = $state<TeachRole | null>(null);
  let isRecording = $state(false);
  let note = $state("");

  const taught = $derived(taughtOf(micKey));
  const sourceText = $derived(taught ? TAUGHT_SOURCE_TEXT : COMBO_SOURCE_TEXT);
  const namedRoles = $derived(Object.values(TeachRole).filter(role => !!taught?.[role]));
  const waitingText = $derived(teachingRole ? PRESS_TEXT[teachingRole] : RECORD_TEXT);

  async function teach(role: TeachRole) {
    note = "";
    teachingRole = role;
    const result = await extensionMessenger
      .sendMessage(ExtensionMessage.MIC_KEY_TEACH, role)
      .catch((error: Error) => ({
        isTaught: false,
        detail: error.message
      }));
    teachingRole = null;
    note = result.detail;
  }

  function record() {
    note = "";
    isRecording = true;
  }

  function cancel() {
    if (isRecording) {
      isRecording = false;
      return;
    }

    void extensionMessenger.sendMessage(ExtensionMessage.MIC_KEY_CANCEL_TEACH).catch(() => {});
  }

  function onRecordedKey(event: KeyboardEvent) {
    if (!isRecording || isModifierOnly(event)) {
      return;
    }

    event.preventDefault();
    const combo = keyComboOf(event);
    note = keyComboProblem(combo);

    if (note) {
      return;
    }

    isRecording = false;
    void saveMicKey(comboMicKey(combo));
  }

  function rename({ role, label }: {
    role: TeachRole;
    label: string;
  }) {
    void saveMicKey(
      withLabel({
        micKey,
        role,
        label
      })
    );
  }

  onMount(() => {
    void micKeyItem.getValue().then(raw => {
      micKey = parseMicKey(raw);
    });
    return micKeyItem.watch(raw => {
      micKey = parseMicKey(raw);
    });
  });
</script>

<svelte:window onkeydown={onRecordedKey} />

<section class="mic-key">
  <span class="sub">Mic key</span>
  <kbd id="mic-key-current" class="current">{micKeyText(micKey)}</kbd>
  <small class="sub">{sourceText}</small>
  {#each namedRoles as role (role)}
    <input
      aria-label={NAME_LABEL[role]}
      onchange={e => rename({
        role,
        label: e.currentTarget.value
      })}
      value={taught?.[role]?.label}
    />
  {/each}
  {#if teachingRole || isRecording}
    <div class="row">
      <span class="waiting">{waitingText}</span>
      <button id="cancel-teach" class="btn" onclick={cancel} type="button">Cancel</button>
    </div>
  {:else if taught}
    <div class="row">
      <button class="btn" onclick={() => teach(TeachRole.KEY)} type="button">Teach again</button>
      {#if taught.heldKey}
        <button class="btn" onclick={() => saveMicKey(withoutHeldKey(micKey))} type="button">Drop held key</button>
      {:else}
        <button class="btn" onclick={() => teach(TeachRole.HELD_KEY)} type="button">Hold with…</button>
      {/if}
    </div>
    <button class="btn" onclick={() => saveMicKey(DEFAULT_MIC_KEY)} type="button">Use a key combo</button>
  {:else}
    <div class="row">
      <button id="record-combo" class="btn" onclick={record} type="button">Record a combo</button>
      <button id="teach-key" class="btn" onclick={() => teach(TeachRole.KEY)} type="button">Teach a macro key</button>
    </div>
  {/if}
  {#if note}
    <small class="sub">{note}</small>
  {/if}
</section>

<style>
  .mic-key {
    display: grid;
    gap: var(--s-2);
  }

  .current {
    justify-self: start;
    font: var(--t-title-m);
  }

  .row {
    display: flex;
    gap: var(--s-2);
    align-items: center;

    & > * {
      flex: 1;
    }
  }

  .waiting {
    font: var(--t-body-m);
  }
</style>
