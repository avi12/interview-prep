export function computeAccept(key: string) {
  return "";
}

export function unmaskFrame(frame: Uint8Array) {
  return { isFinal: false, opcode: 0, payload: new Uint8Array() };
}
