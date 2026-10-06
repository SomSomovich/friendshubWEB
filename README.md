# FriendsHub Web

The web client of FriendsHub — an end-to-end encrypted messenger. Everything a
user types is encrypted in the browser before it is sent, and the server holds
ciphertext it has no key for.

Web client for the FriendsHub API (`API_FRONTEND.txt`), the cryptography bridge
(`WASM_API.txt`) and the WebSocket protocol (`friendshub.proto`).

## Requirements

- Node.js 20 or newer (the build and the harnesses run on `node:` APIs that
  older versions do not have).
- A sibling checkout of the `friendshub-wasm` repository for the crypto module
  (see below).
- Chrome/Edge or Firefox for development. Safari works but is not covered by the
  automated checks.

## Setup

```sh
npm install
npm run dev
```

`npm run dev` runs `scripts/fetch-wasm.mjs` first (`predev`), which is the only
preparation step. The dev server listens on `127.0.0.1:5173` and proxies
`/api/v1` and `/ws` to the deployed API, because the server sends no CORS headers
for a localhost origin and the WebSocket upgrade needs forwarding too. Change the
target in `vite.config.ts` to point at a different deployment.

### The WASM crypto module

`src/wasm/pkg/friendshub_wasm_bg.wasm` is a **build artifact and is not
committed**. It comes from the sibling repository `friendshub-wasm` (a
`wasm-pack` build). `scripts/fetch-wasm.mjs` copies it into place, resolving it
from:

1. `$FRIENDSHUB_WASM_PKG` — a directory, for CI or a differently named checkout;
2. `../friendshub-wasm/pkg` — the repository cloned next to this one.

The JavaScript glue and the `.d.ts` files beside it *are* committed, so a
checkout that already has the `.wasm` file builds without the sibling repo.
Run `npm run fetch-wasm` to do it by hand.

## Environment variables

Read through `src/utils/env.ts`, which works in the browser (`import.meta.env`)
and in Node (`process.env`) alike, so the smoke scripts and the app agree on the
fallbacks.

| Variable | Default | What it is |
|---|---|---|
| `VITE_API_BASE` | `https://api-fh.somuch-system.ru/api/v1` | Base URL of the HTTP API. A relative value (`/api/v1`) works behind the dev proxy. |
| `VITE_WS_URL` | `wss://api-fh.somuch-system.ru/ws` | WebSocket endpoint for message delivery and call signalling. |
| `VITE_VAPID_PUBLIC_KEY` | *(empty)* | Fallback only. The key is normally read from `GET /push/vapid`; a server that does not implement it makes the client fall back to this value, and to a clear "push is unavailable" state if it is empty too. |

## Checks and harnesses

```sh
npm run build     # tsc -b && vite build
npm run lint      # eslint .

npm run smoke:wasm   # the crypto module, in Node
npm run smoke:http   # the REST endpoints, against the real API
npm run smoke:ws     # a real WebSocket session, against the real API
npm run smoke:e2e    # a full round trip: two accounts, real envelopes

node dev-tests/run.mjs storage   # IndexedDB and Web Locks, in a real browser
node dev-tests/run.mjs e2e       # the same round trip, driven from a browser
node dev-tests/run.mjs ui        # screenshots of every screen, both themes
```

The `smoke:*` scripts talk to the deployed API and sign in with the throwaway
account in `scripts/.smoke-account.json` (run `npm run smoke:ws` first if it is
missing). They create no new accounts.

`node dev-tests/run.mjs ui` is the visual check: it boots headless Edge, signs
in through a seed page, and captures each screen in both themes and languages,
asserting substrings against the serialised DOM. It writes the screenshots and
the DOM to `dev-tests/.tmp/`, and takes a mode argument to run a subset
(`node dev-tests/run.mjs ui settings` runs only the captures whose label matches).
That directory is not committed.

## Documentation

- `API_FRONTEND.txt` — the HTTP and WebSocket API.
- `WASM_API.txt` — the crypto bridge's contract.
- `friendshub.proto` — the protobuf schema for the WebSocket frames.
- `README_CALLS.md` — how to test audio and video calls by hand, and what their
  failure modes mean.
- `README_KNOWN_ISSUES.md` — what does not work, and why.

## Architecture in one paragraph

`src/wasm/` wraps the crypto module; `src/crypto/` is the send and receive paths
built on it; `src/ws/` is the socket and its frames; `src/state/` holds one
Zustand store per account plus the app-wide UI store; `src/screens/` and
`src/components/` are the interface. The server sees envelopes and never
plaintext: a payload is a JSON object with a `kind` discriminator, encrypted
pairwise for every device of every recipient, and the envelope type on the wire
is the only thing the server can read.
