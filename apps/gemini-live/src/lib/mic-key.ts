export const MIC_KEY = "F13";

export const onMicKey = (toggle: () => void) =>
  window.addEventListener(
    "keydown",
    event => {
      if (event.code !== MIC_KEY || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    },
    true
  );
