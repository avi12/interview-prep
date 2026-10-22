export const MIC_KEY_LABEL = "M1";

const ROCCAT_EVENTS = { vendorId: 0x1e7d, productId: 0x303e, usagePage: 0x000a } as const;
const EVENT_REPORT_ID = 0x03;
const M1_PRESS = [0x00, 0x19, 0x7d, 0x00];

const opened = new WeakSet<HIDDevice>();

const isEventChannel = (device: HIDDevice) =>
  device.vendorId === ROCCAT_EVENTS.vendorId &&
  device.productId === ROCCAT_EVENTS.productId &&
  device.collections.some(collection => collection.usagePage === ROCCAT_EVENTS.usagePage);

const isM1Press = ({ reportId, data }: HIDInputReportEvent) =>
  reportId === EVENT_REPORT_ID && data.byteLength >= M1_PRESS.length && M1_PRESS.every((byte, index) => data.getUint8(index) === byte);

const hid = () => ("hid" in navigator ? navigator.hid : null);

const listen = async ({ device, toggle }: { device: HIDDevice; toggle: () => void }) => {
  if (!isEventChannel(device) || opened.has(device)) return;
  opened.add(device);
  device.addEventListener("inputreport", event => {
    if (isM1Press(event)) toggle();
  });
  if (!device.opened) await device.open().catch(() => opened.delete(device));
};

export const openMicKeys = async (toggle: () => void) => {
  for (const device of (await hid()?.getDevices()) ?? []) await listen({ device, toggle });
};

export const watchMicKeys = (toggle: () => void) => {
  hid()?.addEventListener("connect", ({ device }) => void listen({ device, toggle }));
  void openMicKeys(toggle);
};

export const hasMicKey = async () => ((await hid()?.getDevices()) ?? []).some(isEventChannel);

export const requestMicKey = async () => ((await hid()?.requestDevice({ filters: [ROCCAT_EVENTS] })) ?? []).some(isEventChannel);
