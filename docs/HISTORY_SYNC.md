# History sync v1

The requesting device sends `ClientFrame.history_request` for another active device of the same account. The server relays its device number and up to 200 conversation UUIDs. The source verifies the target against `/devices` and the requested conversations against `/conversations`.

Responses are ordinary pairwise-encrypted `ENVELOPE_TYPE_SYNC` (2) envelopes addressed to the requesting own device. `conversation_id` must match the encrypted payload. No identity private keys, Signal sessions, sender keys, local file paths or account/session tokens are exported.

Each encrypted payload is UTF-8 JSON:

```json
{"kind":"history_sync","version":1,"transfer_id":"UUID","conversation_id":"UUID","item_kind":"message","item_id":"logical-message-id","part_index":0,"part_count":1,"data":"base64"}
```

`data` contains one fragment of the item's UTF-8 JSON bytes, encoded as standard base64. Fragments are at most 24 KiB before base64, and items at most 2 MiB. Concatenate decoded fragments in `part_index` order before decoding UTF-8/JSON. UTF-8 characters may cross fragment boundaries. Assemblies are isolated by account, source device, transfer, conversation, kind and item ID. Incomplete items are kept in memory for at most ten minutes and cleared when the account connection is disposed; after a reload, repeat the request. Complete records survive and are deduplicated.

Message item JSON has `message` (the existing `kind=message` payload with `message_id`, `text`, `reply_to`, `forward_from`, `attachment_ids`, `created_at`), `sender_account_id`, `sender_device_number`, `server_timestamp`, nullable `edited_at`, and `reactions` (`actor_id`, `emoji`, `created_at`). Original authors are accepted only from authenticated own-device SYNC envelopes. Pending/failed drafts are excluded. Existing local messages with the same logical ID in the same conversation are preserved. New copies receive local envelope IDs and target-device routing.

Attachment item JSON has `attachment_id`, `key_hex` (32 bytes), `base_nonce_hex` (4 bytes), `file_name`, `content_type`, `total_size`, `chunk_count`, and `kind`. Transfer these before their referencing message. Binary file contents stay in attachment storage and are fetched through the normal attachment API.

A `complete` item uses the conversation UUID as `item_id` and contains `message_count`. It follows all items for that conversation, including when the count is zero. No local history is deleted by a snapshot. Channels and bot threads use their account-level HTTP histories and are excluded.

Export uses stable `(clientTimestamp, envelopeId)` pagination, persists ratchet state before writing each envelope, and limits transmission to 25 envelopes per second. A disconnected transfer can be requested again; completed imports are idempotent. A transfer is complete only after completion items for every requested conversation. An inactive request times out after two minutes without incoming fragments.
