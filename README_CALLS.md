# Calls (WebRTC)

FriendsHub Web places one-to-one audio and video calls. This document is the
manual test procedure, because the parts that can break are the parts no
automated test in this repository can reach.

## Why it cannot be automated

`dev-tests/run.mjs ui` drives one headless browser. A call needs **two** — two
accounts, two devices, two media paths — and a headless browser has no camera,
no microphone and no second peer for the ICE checks to succeed against. The
harness therefore captures the call *screen* (see `call-outgoing-dark-ru`) and
nothing more. Everything else on this page is done by hand.

`navigator.mediaDevices` is also undefined outside a secure context, so the
manual test has to run on `https://` or on `localhost`.

## Procedure — two accounts, one machine

You need two accounts that can reach each other. The simplest setup is the
deployed instance in two browser windows:

1. Build and serve the client: `npm run build && npm run preview`. The preview
   server proxies `/api/v1` and `/ws` to the API in `vite.config.ts`.
2. Open `http://127.0.0.1:4173` in one **normal** window and sign in as account
   A. Accept the notification prompt or dismiss it.
3. Open the same URL in a **private/incognito** window (a second normal window
   shares the same IndexedDB and would be the same account) and sign in as
   account B.
4. In each window, open the conversation with the other account. If there is
   none yet, search for the other account's FH number and write to it first —
   `POST /conversations/direct` creates the chat on the first message.
5. In A, press the phone icon in the chat header (or **… → Аудиозвонок**).

Expected in A: the chat is replaced by the call screen, showing the peer's name
and avatar, `Вызов…`, a speaker control and a red **Завершить**.
Expected in B: the ringing overlay — the caller's avatar, their name, the
sentence *«Входящий звонок от …»* in the accessibility tree, and green/red
phone buttons.

6. Press **Принять** in B.

Expected in both: the status line changes from `Вызов…` / `Подключение…` to a
running `MM:SS` clock within a second or two, and the audio is audible in both
windows. On a video call the remote picture fills the screen and the local
preview appears bottom-right at 120×160.

## What to check

| Area | What correct looks like |
|---|---|
| Duration | Starts when the media path is up, not when the button was pressed. Both sides show roughly the same value. |
| Speaker | A solid white disc when on. Default: **on** for a video call, **off** for an audio call. See the limitation below. |
| Video toggle | Only present on a video call. Turning it off greys the local preview and the peer stops seeing a picture — but still hears audio. |
| Switch camera | Only present on a video call. On a phone it flips between the two cameras; on a desktop with one webcam it shows *«Другая камера не найдена»*. |
| End | Either side pressing it closes the overlay on both within a second. |
| Signalling | ICE candidates are trickled one per envelope, never batched (API brief §4.11). Watch the network tab: each candidate is its own WebSocket upload frame. |

## Common failure modes

**`Нет доступа к микрофону или камере`.**
The permission prompt was dismissed, or the page is not on a secure origin. The
call screen stays up with the message and an end button rather than vanishing —
check `chrome://settings/content/microphone` and that the URL is `https://` or
`localhost`.

**`Не удалось получить настройки подключения`.**
`GET /webrtc/ice-servers` failed. Without ICE servers no peer connection is
created at all, so this is the first thing to check against the API directly:

```
curl -H "Authorization: Bearer $TOKEN" "$API/api/v1/webrtc/ice-servers"
```

**Both sides reach `Подключение…` and stay there.**
The offer and answer were exchanged but no candidate pair succeeded. Usually one
of:
- the server returned STUN servers only, and the two peers are behind symmetric
  NATs that need TURN;
- the TURN credentials expired mid-test (they are HMAC-derived and short-lived —
  the client refreshes an hour before expiry, but a long-idle tab can outlive
  them);
- a firewall is dropping UDP; check whether the TURN URLs offer
  `?transport=tcp` and whether the client is receiving any of them.

**`Соединение потеряно` and the overlay closes.**
The WebSocket dropped. The signalling has no other transport, so the call is
ended rather than left half-alive. Reconnect and call again.

**`У собеседника нет устройства, которое могло бы принять звонок`.**
`GET /accounts/{id}/devices` returned nothing — the other account is signed in
nowhere, or every device was revoked.

**`Звонок отклонён`.**
The other side pressed decline, was already on a call (the busy rejection), or
let it ring for 60 seconds.

**The callee's window rings but nothing is audible.**
Browsers refuse to start an `AudioContext` before the user has interacted with
the page, and an incoming call arrives with no gesture behind it. Click anywhere
in the window first — the ring tone synthesised by `src/calls/ringtone.ts` is
silent until then, though the overlay still appears.

## Known limitations

- **The speaker toggle is a preference, not a guarantee.** The web has no
  earpiece concept: iOS Safari exposes no output selection at all, and a phone
  routes the audio by its own rules. Where `HTMLMediaElement.setSinkId` exists
  (Chromium on the desktop) the toggle really does select another output device;
  everywhere else it changes state and nothing else. See `src/calls/speaker.ts`.
- **Calls are one-to-one only.** Signalling is pairwise — one envelope per device
  of one peer — so a group conversation shows no call controls. The API's call
  record also names a single `peer_account_id`.
- **Only the peer's devices are signalled.** This account's *other* devices do
  not ring and do not mirror the call, so answering on a second device is not
  supported.
- **A ringing outgoing call has no timeout.** It rings until either side acts.
  Only an incoming call auto-declines (after 60 s).
- **No ringback tone.** The caller sees `Вызов…` but hears nothing while waiting,
  because the operator tone is not ours to synthesise.
