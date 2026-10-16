import { Copy, Pencil, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { MessageRecord } from '../../storage/db'
import { REACTION_EMOJI, ownReaction } from '../../utils/reactions'
import type { DropdownItem } from '../ui/DropdownMenu'
import type { MenuReaction } from '../ui/MenuItems'

/**
 * The entries a message offers when it is long-pressed or right-clicked.
 *
 * Reply and forward are deliberately absent: they need a reply-to field on the
 * record and a thread to put them in, and neither exists yet. An entry that
 * opened an empty screen would be worse than no entry.
 */

export type MessageMenuHandlers = {
  onRetry?: () => void
  onEdit: () => void
  onTogglePin: () => void
  onCopy: () => void
  onDelete: () => void
}

export function buildMessageMenuItems(
  message: MessageRecord,
  own: boolean,
  t: TFunction,
  handlers: MessageMenuHandlers,
): DropdownItem[] {
  return [
    ...(own &&
    handlers.onRetry !== undefined &&
    message.status === 'failed' &&
    message.attachments.length === 1 &&
    message.attachments[0]?.startsWith('local:')
      ? [
          {
            id: 'retry',
            label: t('common.retry'),
            icon: RotateCcw,
            onSelect: handlers.onRetry,
          },
        ]
      : []),
    ...(own
      ? [
          {
            id: 'edit',
            label: t('chat.menu.edit'),
            icon: Pencil,
            onSelect: handlers.onEdit,
          },
        ]
      : []),
    {
      id: 'pin',
      label: message.isPinned ? t('chat.menu.unpin') : t('chat.menu.pin'),
      icon: message.isPinned ? PinOff : Pin,
      onSelect: handlers.onTogglePin,
    },
    {
      id: 'copy',
      // Nothing to copy from a message that has not been decrypted.
      disabled: message.plaintext === null,
      label: t('chat.menu.copy'),
      icon: Copy,
      onSelect: handlers.onCopy,
    },
    ...(own
      ? [
          {
            id: 'delete',
            label: t('chat.menu.deleteMessage'),
            icon: Trash2,
            danger: true,
            onSelect: handlers.onDelete,
          },
        ]
      : []),
  ]
}

export function buildReactionOptions(
  message: MessageRecord,
  selfAccountId: string,
  t: TFunction,
  toggle: (emoji: string) => void,
): MenuReaction[] {
  const current = ownReaction(message.reactions, selfAccountId)

  return REACTION_EMOJI.map((emoji) => ({
    emoji,
    label: t('chat.reactions.reactWith', { emoji }),
    active: current === emoji,
    onSelect: () => {
      toggle(emoji)
    },
  }))
}
