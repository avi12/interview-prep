import { EDGE_USER_AGENT } from "#scripts/lib/edge-tts/constants.ts";

type EdgeWebSocketConstructor = new (url: string, init: { headers: Record<string, string> }) => WebSocket;

const EdgeWebSocket: EdgeWebSocketConstructor = WebSocket;

export function openEdgeSocket(url: string) {
  return new EdgeWebSocket(url, {
    headers: {
      "User-Agent": EDGE_USER_AGENT
    }
  });
}
