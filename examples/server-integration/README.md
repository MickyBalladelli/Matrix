# Server Integration example

This Vite + TypeScript example connects Matrix to a real HTTP API. The default adapter calls `GET /api/profile` and `POST /api/profile`, validates the response status, passes cancellation signals to `fetch`, and keeps form validation in the client as a user-experience aid.

Run it with `npm install`, then `npm run dev`. Build it with `npm run build`. Add a server endpoint for `/api/profile` to use the default adapter.

The local browser fixture injects an API adapter, loads a profile, edits it, and verifies the POST payload without starting a server or making a network request.

## Performance notes

`resource()` cancels an older profile request before a reload and passes an `AbortSignal` into `fetch`. Keep response payloads small and validate them before rendering.
