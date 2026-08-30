# Real-time Chat example

This app demonstrates WebSocket lifecycle handling, incoming message parsing, keyed message rendering, connection status, and an offline echo socket for local demos.

Run `examples/chat/index.html` through a local static server. Pass `{ url: 'wss://your-host/chat' }` to `mountChatApp()` for a real WebSocket, or inject a `socket`/`socketFactory` in tests.

## Test

`test/examples.browser.js` injects a deterministic socket, waits for the open event, sends a message, and feeds an incoming server message through the message handler.

## Performance notes

Messages use keyed rows and append incrementally, so a new message does not rebuild existing message nodes. Add pagination or windowing for long histories, and keep reconnect/backoff logic in the transport adapter rather than the render path.
