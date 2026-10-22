export const MIC_KEY = { code: "F12", isCtrl: true, isAlt: true, isShift: true, label: "M1" } as const;

const isMicKey = (event: KeyboardEvent) =>
  event.code === MIC_KEY.code && event.ctrlKey === MIC_KEY.isCtrl && event.altKey === MIC_KEY.isAlt && event.shiftKey === MIC_KEY.isShift;

export const onMicKey = (toggle: () => void) =>
  window.addEventListener(
    "keydown",
    event => {
      if (!isMicKey(event) || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    },
    true
  );
