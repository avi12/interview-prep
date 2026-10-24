<script lang="ts">
  const { text }: { text: string } = $props();

  let copies = $state(0);
</script>

<span class="copy-line">
  <code>{text}</code>
  <button
    class="btn"
    onclick={async () => {
      await navigator.clipboard.writeText(text);
      copies++;
    }}
    type="button"
  >
    Copy
  </button>
  {#key copies}
    {#if copies > 0}
      <small class="copied" role="status">Copied</small>
    {/if}
  {/key}
</span>

<style>
  .copy-line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    align-items: center;

    & code {
      overflow-wrap: anywhere;
    }
  }

  .copied {
    color: var(--fg-muted);
    animation: fade-out 1600ms var(--ease-emph) forwards;
  }

  @keyframes fade-out {
    0%,
    60% {
      opacity: 100%;
    }

    100% {
      opacity: 0%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .copied {
      animation: none;
    }
  }
</style>
