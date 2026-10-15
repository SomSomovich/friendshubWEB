import type { BotMessage } from '../api/bots'

export function mergeBotMessages(current: BotMessage[], incoming: BotMessage[]): BotMessage[] {
  const messages = new Map([...incoming, ...current].map((message) => [message.id, message]))
  return [...messages.values()].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
}
