# Known issues and deliberate omissions

Everything here is a known gap rather than a bug nobody noticed. Each entry says
what is missing, why, and what it would take to close it.

## Cannot be verified automatically

**Audio and video calls.** A live call needs two browsers with real media
devices and a peer for the ICE checks to succeed against; the harness drives one
headless browser. What *is* checked automatically is that the call screen opens
when the call button is pressed (`call-outgoing-dark-ru`). Everything else is in
`README_CALLS.md` as a manual procedure. Related: `navigator.mediaDevices` does
not exist outside a secure context, so calls need `https://` or `localhost`.

**Push notifications.** `GET /push/vapid` now answers with a key
(`subject: mailto:som0somovich@gmail.com`), so the client does register a
subscription — but nothing has verified that a wake-up push actually arrives,
because the service worker's handlers are checked by their presence in the built
worker rather than by firing them. Treat "a notification appeared on a locked
phone" as untested until someone has seen it.

**Safari.** Not tested. The code avoids the platform-specific APIs it can avoid
(`setSinkId` is feature-detected, `MediaRecorder` falls back to whatever the
browser will record), but nothing has been run against it.

## Deliberately not implemented

**Group calls.** Call signalling is pairwise — one envelope per device of one
peer — and `POST /calls` names a single `peer_account_id`. Call controls are
therefore hidden outside a direct conversation. A group call needs a different
signalling contract, not more UI.

**Answering a call on a second device of the same account.** Only the peer's
devices are signalled; this account's other devices do not ring and do not mirror
the call.

**The speaker toggle only really switches output where the platform allows it.**
`HTMLMediaElement.setSinkId` exists in Chromium on the desktop, and there the
toggle selects a different sink. On a phone the web exposes no output routing at
all, so the button changes state and nothing else. See `src/calls/speaker.ts`.

**No ringback tone, and no timeout on an outgoing call.** The caller sees
`Вызов…` and hears nothing while waiting; the call rings until either side acts.
Only an incoming call declines itself (after 60 seconds).

**Edit and delete from a *second* device of the same account** target the wrong
envelope: the sync payload does not carry the per-device envelope map, so a
device that received a message by sync knows only its own id. Single-device use
is unaffected.

**Channel posts** have API clients but no UI; a channel renders as a
conversation with no composer.

**Group and contact management after creation** (adding members, invites, roles)
has API clients but no UI.

## Performance

**The message list is not virtualised.** This is the one performance item from
the 4.12 brief that was left out, on the user's decision after seeing the trade.
Every message keeps a real DOM node because three things depend on it:

- the scroll anchoring measures nodes to compensate for older pages arriving
  above the viewport;
- jumping to a search hit or a pinned message looks a node up by id;
- the sticky day headings and the "rest at the composer" layout are properties
  of a normally-flowed list.

A windowed list would have to give up at least the first two. Paging already
bounds how much is fetched at once (fifty messages per page), so the cost is
confined to a reader who scrolls back through a very long conversation in one
sitting — there the DOM grows and scrolling can become heavy on a low-end phone.
Revisiting this means `react-window` (or equivalent) plus a replacement for the
search and pin jumps, e.g. scrolling to an index rather than to a node.

## Behaviour worth knowing

**A device that cannot be reached is left out, and the message does not wait for
it.** A device left behind — an old browser profile, or one from before a
sign-out, which registers a new device number — with an empty pool of one-time
prekeys can never be given a session again, and it used to fail every message to
its owner even though each of their other devices would have taken it. Now the
unreachable devices are skipped and the rest are delivered to.

What that costs: the message **does not arrive on the device that was skipped**.
It is not queued for it and nothing retries, so a device that is merely out of
prekeys will miss whatever was sent before its owner's client tops the pool back
up. Only two failures are treated this way — `replenish_required`, which is a
drained pool, and a `404`, which is a device that no longer exists. A rate limit,
a server error or a dropped connection still fails the send outright, because
those are not facts about the device.

The cleaner cure for the same situation is to revoke the abandoned device
(`DELETE /devices/{id}`, allowed when your own device is number 1 or older than
three days), after which there is nothing left to skip.

**A long-lived tab tops its prekey pool up only when its socket reconnects.**
Since v0.3.2 the top-up runs on `connected`, which covers every reload, account
switch and reconnect — but a tab left open for days with a connection that never
drops has no such moment. Its pool is consumed by other people's traffic, so it
can still run down without the tab noticing. A periodic check would close it.

**A 401 does not sign the account out.** The session is *ended*, not erased: the
account stops being the active one and the reader lands on the login screen, but
its messages, keys and IndexedDB record are untouched, so an accidental
server-side revocation does not destroy local history. The account remains in the
switcher, where selecting it will fail again until the user signs in anew.

**Local history is per device and is not recoverable from the server.** Only
Saved Messages can be replayed from the API; ordinary history exists only on the
devices that received it. Signing out with "forget this account" therefore
discards it for good.

**Several files exceed the 300-line limit** set by the project rules. All of them
predate the polish pass, and each is a single cohesive unit whose natural split
is by internal panel or by flow — real refactors, not line shuffling, which is
why they were not attempted in a pass whose job was to change how the app feels
rather than what it does:

| File | Lines | Where the split is |
|---|---|---|
| `src/screens/ChatScreen.tsx` | 902 | One component per overlay (attachments, search, pin banner, message menu) plus a hook for the conversation's actions. |
| `src/state/accountStore.ts` | 596 | The actions object is already the seam: send, receive, read state, bot threads. |
| `src/crypto/send.ts` | 347 | Pairwise, group and Saved each deserve a module. |
| `src/screens/CreateChannelScreen.tsx` | 347 | The wizard steps. |
| `src/components/settings/PrivacyPanels.tsx` | 335 | It is three panels that happen to share a file. |
| `src/components/chat/MessageComposer.tsx` | 325 | The voice recorder is the independent half. |
| `src/crypto/payloads.ts` | 324 | Parsing and the wire↔domain conversions. |
| `src/ws/client.ts` | 324 | Handshake versus steady state. |

Two files that *were* over the limit and are touched by this pass were brought
under it: `MessageList.tsx` (392 → 158, split into `messageGroups.ts`,
`MessageDayGroup.tsx`, `MessageListSkeleton.tsx` and `useTranscriptScroll.ts`)
and `ChatList.tsx` (310 → 283, via `ChatListFilters.tsx` and
`ChatListSkeleton.tsx`).
