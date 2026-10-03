/**
 * Domain types shared by the API, storage, crypto and (later) UI layers.
 *
 * These describe the app's view of the data, not the wire format: the server's
 * snake_case responses are mapped onto them in `src/api`, and `src/storage`
 * wraps them in per-account records that add the owning `accountId`, because a
 * single IndexedDB instance holds up to five accounts.
 */

export type { Account } from './account'
export type { Attachment, AttachmentKind } from './attachment'
export type { Conversation, ConversationKind } from './conversation'
export type { Message, MessageStatus, Reaction } from './message'
