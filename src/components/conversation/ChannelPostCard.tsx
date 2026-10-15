import { MessageSquare, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addPostReaction, listPostReactions, removePostReaction, type ChannelPost } from '../../api/channel_posts'
import { useLongPress } from '../../hooks/useLongPress'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import type { Account } from '../../types'
import { REACTION_EMOJI, ownReaction, countReactions } from '../../utils/reactions'
import { ContextMenu } from '../ui/ContextMenu'
import type { DropdownItem } from '../ui/DropdownMenu'
import type { MenuReaction } from '../ui/MenuItems'
import { MessageReactions } from '../chat/MessageReactions'
import { ChannelAttachment } from './ChannelAttachment'

export type ChannelPostCardProps = {
  account: Account
  post: ChannelPost
  authorName: string
  canManage: boolean
  discussionEnabled: boolean
  onDiscussion: () => void
  onEdit: () => void
  onTogglePin: () => void
  onDelete: () => void
}

/** A channel post is a message in a broadcast feed, with the chat's interaction model. */
export function ChannelPostCard({ account, post, authorName, canManage, discussionEnabled, onDiscussion, onEdit, onTogglePin, onDelete }: ChannelPostCardProps) {
  const { t, i18n } = useTranslation()
  const fail = useActionReporter('channel-reactions')
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const load = useCallback((current: Account) => listPostReactions(current, post.id), [post.id])
  const resource = useAccountResource(account, load, post.id)
  const reactionRows = resource.data ?? []
  const current = ownReaction(reactionRows, account.id)
  const longPress = useLongPress((x, y) => setMenu({ x, y }))

  async function toggleReaction(emoji: string): Promise<void> {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      if (current === emoji) await removePostReaction(account, post.id)
      else await addPostReaction(account, post.id, emoji)
      resource.reload()
    } catch (cause) { fail(cause) }
    finally { lock.current = false; setBusy(false) }
  }

  const reactions = countReactions(reactionRows, account.id)
  const menuItems: DropdownItem[] = canManage
    ? [
        { id: 'pin', label: t(post.pinnedAt ? 'channelFeed.unpin' : 'channelFeed.pin'), icon: post.pinnedAt ? PinOff : Pin, disabled: busy, onSelect: onTogglePin },
        { id: 'edit', label: t('channelFeed.edit'), icon: Pencil, disabled: busy, onSelect: onEdit },
        { id: 'delete', label: t('channelFeed.delete'), icon: Trash2, danger: true, disabled: busy, onSelect: onDelete },
      ]
    : []
  const menuReactions: MenuReaction[] = REACTION_EMOJI.map((emoji) => ({
    emoji,
    label: t('chat.reactions.reactWith', { emoji }),
    active: current === emoji,
    onSelect: () => { void toggleReaction(emoji) },
  }))

  return (
    <article id={`channel-post-${post.id}`} onContextMenu={(event) => { event.preventDefault(); setMenu({ x: event.clientX, y: event.clientY }) }} {...longPress}
      className="mx-auto flex w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-sm">
      <div className="flex min-w-0 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
          <span className="truncate">{authorName}</span>
          <time className="shrink-0 tabular-nums">{new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.createdAt * 1000))}{post.editedAt ? ` · ${t('channelFeed.edited')}` : ''}</time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-fg [overflow-wrap:anywhere]">{post.text}</p>
        {post.attachmentIds.length === 0 ? null : <div className="flex flex-col gap-2">{post.attachmentIds.map((id, index) => <ChannelAttachment key={id} account={account} attachmentId={id} index={index + 1} />)}</div>}
        <MessageReactions reactions={reactions} labelFor={(reaction) => t('chat.reactions.toggle', { emoji: reaction.emoji, n: reaction.count })} onToggle={(emoji) => { void toggleReaction(emoji) }} />
      </div>
      {discussionEnabled ? <button type="button" onClick={onDiscussion} className="flex min-h-10 items-center gap-2 border-t border-border px-4 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
        <MessageSquare className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{t('channelFeed.discussion', { count: post.discussionCommentCount })}</span>
      </button> : null}
      <ContextMenu open={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={menuItems} reactions={menuReactions} onClose={() => setMenu(null)} />
    </article>
  )
}
