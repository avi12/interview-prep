export function computeAccept(_key: string) {
  return "";
}

export function unmaskFrame(_frame: Uint8Array) {
  return {
    isFinal: false,
    opcode: 0,
    payload: new Uint8Array()
  };
}
