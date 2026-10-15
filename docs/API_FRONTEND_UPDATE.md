# Frontend API update, 2026-10-15

Changes are scoped to friendshubWEB. The original working tree was saved in
`6a79bd1` before the feature commits.

## User-facing additions

- Profile custom fields and server-backed invisibility, DM policy and group-add
  policy with exceptions.
- Canonical group/channel metadata, group member add/remove, ownership transfer,
  deletion and owner channel analytics.
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

The user approved using `/invites/join/{token}` for channel invitations and is
adding that server permission. No backend source was changed here.

Reactions currently return one page of at most 200. No fictitious `seq` cursor is
sent. A full page is labelled as potentially incomplete in the interface.

Bot and device-envelope history currently expose exclusive timestamp cursors.
The client requests 200 and overlaps the boundary second with ID deduplication.
A second containing a complete page remains unpageable without a server fix.
Pending future contract: `before` + `before_id`; reactions will instead use
`before_created_at` + `before_actor_id`. Connect those only after the updated API
is deployed/documented.

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
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Browser tests use real Firefox/IndexedDB with mocked HTTP responses. They verify
forms, permissions, confirmation dialogs, one-time credentials, the history
import contract, channel publishing and raw attachment byte round trips. A live
multi-device/server acceptance run remains necessary before deployment.
