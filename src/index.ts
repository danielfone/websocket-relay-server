export interface Env {
  WSR: DurableObjectNamespace;
}

//
// A Cloudflare Worker that handles WebSocket connections for a relay server.
//
// The relay server is responsible for relaying messages between clients
// connected to the same channel. The channel is managed via a DurableObject
// that is instantiated once per channel.
//
// Connect to the server with a websocket request:
//
//  const ws = new WebSocket("wss://example.com/{channel_id}");
//
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Return an error if this is not a websocket request
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", {
        status: 400,
      });
    }

    // The path is expected to be in the form of /{channel_id}
    // Check we have a channel_id and extract it.
    const url = new URL(request.url);
    const channelId = url.pathname.slice(1);

    // Load the DurableObject for the given channel and route the request to it.
    const id = env.WSR.idFromName(channelId);
    const channel = env.WSR.get(id);
    return channel.fetch(request);
  },
};

// The WebSocketRelay class is a DurableObject that handles the actual
// websocket connections. It is instantiated once per channel.
export class WebSocketRelay {
  // The set of connected clients.
  clients: Set<WebSocket>;
  // The id of the DurableObject.
  channelId: string | null;

  constructor() {
    this.clients = new Set();
    this.channelId = null;
  }

  fetch(request: Request): Response {
    // Get the connection parameters from the request.
    const url = new URL(request.url);
    this.channelId ??= url.pathname.slice(1);

    const { 0: client, 1: server } = new WebSocketPair();
    this.configureWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  private configureWebSocket(ws: WebSocket) {
    const channelId = this.channelId;
    const clientId = Math.random().toString(36).slice(2); // Generate a random id for the client.

    console.log("websocket.connect", { channelId, clientId });
    ws.accept();

    this.clients.add(ws);

    ws.addEventListener("message", (event: MessageEvent) => {
      const byteSize = (event.data instanceof ArrayBuffer)
        ? event.data.byteLength
        : event.data.length;

      console.log("websocket.message", { channelId, clientId, byteSize });
      for (const client of this.clients) {
        if (client !== ws) client.send(event.data);
      }
    });

    ws.addEventListener("close", (event: CloseEvent) => {
      const { code, reason } = event;
      console.log("websocket.close", { channelId, clientId, code, reason });
      // Remove the client from the set of active clients.
      this.clients.delete(ws);
    });

    ws.addEventListener("error", (event: ErrorEvent) => {
      console.log("websocket.error", {
        channelId,
        clientId,
        error: event.error,
      });
      this.clients.delete(ws);
    });
  }
}
