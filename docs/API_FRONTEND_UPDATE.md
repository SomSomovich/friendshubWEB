# Frontend API update, 2026-10-15

Changes are scoped to friendshubWEB. The original working tree was saved in
`6a79bd1` before the feature commits.

## User-facing additions

- Profile custom fields and server-backed invisibility, DM policy and group-add
  policy with exceptions.
- Canonical group/channel metadata, group member add/remove, ownership transfer,
  deletion and channel analytics for owners and administrators.
- Settings → My bots: create, set handle, rotate credentials and delete. Complete
  bot tokens appear only in the one-time response dialog.
- Main menu → Call history and public group/channel directory; security event log.
- Channel feed: HTTP posts with UUID pagination, publishing, editing, deletion,
  pins, reactions and opening the linked discussion group. Opening a post fetches
  its detail and registers its view for owner analytics.
- Channel media: original unencrypted chunks, finalized attachment IDs in posts,
  on-demand downloading, type sniffing and image/video/audio viewing. Channels
  are server-readable broadcasts. Direct/group E2E attachments retain their
  separate encryption and key-distribution flow. Original public filenames are
  not returned by the API; downloads use the existing generated filename policy.
- Own-device encrypted history transfer. Wire payloads are documented separately
  in `HISTORY_SYNC.md` for future native clients.
- Explicit best-effort server history for the current device, with a report of
  restored, already stored, unavailable and skipped envelopes. Existing local
  message state wins. Historical controls/calls are not applied over newer local
  state. Pending identity-change warnings are retained.
- Current protobuf metadata/history events and server frame/rate limits.

## Confirmed API boundaries

The evening API is deployed. Channel invitations use `/invites/join/{token}`;
an existing subscriber gets 200 without consuming a one-time invite. No backend
source was changed here.

Bot history, device envelopes and Saved Messages continue with `before` and
`before_id` from the last raw row. Reactions use `before_created_at` and
`before_actor_id`, with explicit load-more/retry controls and actor deduplication.
The former timestamp-overlap workaround and 200-reaction UI cap are removed.
Saved Messages retain raw page boundaries separately from decrypted messages:
a full control-only page or a decryption failure cannot terminate pagination.
Existing decrypted rows are reused instead of consuming their ratchet keys again.
An initial local history-clear cutoff can still be a timestamp; it is a time
boundary, not a page continuation. All actual continuations carry both fields.

All 13 currently emitted security-event types are translated. Event context
shows the revoked device, session count or affected owner/conversation. Login
success events now mean full authentication, including 2FA; no login request
format changed. Metrics have two per-route counters with normalized route
labels. This messenger has no metrics dashboard, so their integration is limited
to updating API_FRONTEND.txt rather than adding an operations UI.

A new device cannot decrypt ciphertext addressed to an old session. Server TTL
can remove old ciphertext. Losing all devices/keys prevents full recovery without
backup. The security screen explains these limits and prioritizes own-device
transfer. Server replay restores text and accessible attachment keys; final edit,
reaction and deletion state should come from the source device.

The discussion endpoint supplies a linked group and thread identifier, but no
comment transport/filter contract is defined. The UI opens the linked group;
it does not invent a separate server comment protocol.

## Offline validation

All commands run from friendshubWEB. No production account/API mutations are
performed by these tests.

```sh
node --experimental-vm-modules scripts/auth-session.test.mjs
node --experimental-vm-modules scripts/api-contracts.test.mjs
node --import tsx scripts/ws-contracts.test.mjs
node --import tsx scripts/history-contracts.test.mjs
node --import tsx scripts/channel-contracts.test.mjs
node --import tsx scripts/wasm-smoke.mjs
node dev-tests/api-history-smoke.mjs
node dev-tests/api-history-smoke.mjs dev-tests/api-ui-smoke.tsx
node dev-tests/api-history-smoke.mjs dev-tests/api-cursors-smoke.tsx
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Browser tests use real Firefox/IndexedDB with mocked HTTP responses. They verify
forms, permissions, confirmation dialogs, one-time credentials, the history
import contract, channel publishing and raw attachment byte round trips. The
cursor suite loads 501 same-second bot messages/envelopes/reactions, retries a
failed reaction page, checks control-only saved pages, admin/subscriber access,
security-event context and repeated channel invite navigation in StrictMode. A live
multi-device/server acceptance run remains necessary before deployment.
