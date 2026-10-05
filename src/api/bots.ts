import type { AccountAuth } from './auth'
import { get, post } from './client'

/**
 * Talking to a bot (API_FRONTEND.txt §19).
 *
 * A bot is not an account: it has no FH number, it does not appear in the
 * conversation list, and `POST /conversations/direct` cannot start a chat with
 * one. Its thread is its own thing, with its own history and its own send — which
 * is why this module exists separately from `conversations.ts` rather than being
 * folded into it.
 */

export type BotInfo = {
  botId: string
  ownerAccountId: string
  handle: string
  createdAt: number
}

/** A bot this account owns; the token is never returned, only its prefix. */
export type OwnedBot = {
  botId: string
  handle: string
  tokenPrefix: string
  createdAt: number
  hasWebhook: boolean
}

export type BotMessage = {
  id: string
  botId: string
  senderAccountId: string
  /** Which way it went; the history contains both. */
  direction: 'to_bot' | 'from_bot'
  text: string
  replyToId: string | null
  createdAt: number
}

export function getBotInfo(account: AccountAuth, botId: string): Promise<BotInfo> {
  return get<BotInfo>(`/bots/${encodeURIComponent(botId)}/info`, { account })
}

/** The whole thread, oldest first as the server sends it. */
export function listBotMessages(account: AccountAuth, botId: string): Promise<BotMessage[]> {
  return get<BotMessage[]>(`/bots/${encodeURIComponent(botId)}/messages`, { account })
}

/** @returns the stored message, which is what the thread appends. */
export function sendBotMessage(
  account: AccountAuth,
  botId: string,
  input: { text: string; replyToMessageId?: string | null },
): Promise<BotMessage> {
  return post<BotMessage>(
    `/bots/${encodeURIComponent(botId)}/messages`,
    { text: input.text, reply_to_message_id: input.replyToMessageId ?? null },
    { account },
  )
}
