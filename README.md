# websocket-relay-server

The relay server is responsible for relaying messages between clients
connected to the same channel. The channel is managed via a DurableObject
that is instantiated once per channel.

Connect to the server with a websocket request:

    const ws = new WebSocket("wss://example.com/{channel_id}?create={true|false}");

`create` is an optional paramter. If omitted, the connection will create a
new channel if it does not already exist, or join an existing channel if it
does. If provided, the connection will only create a new channel if the
value is `true`, or join an existing channel if the value is `false`,
otherwise it will fail.

## How It Works

- Cloudflare workers + durable objects
- TODO elaborate on this

## Development

TODO: explain how to run the server locally etc
