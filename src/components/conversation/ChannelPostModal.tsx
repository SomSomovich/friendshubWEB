import { ChannelAttachment } from './ChannelAttachment'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addPostReaction, getChannelPost, listPostReactions, removePostReaction, REACTIONS_PAGE_SIZE, type ChannelPost, type PostReaction } from '../../api/channel_posts'
import { useAccountResource } from '../../hooks/useAccountResource'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useSenderNames } from '../../hooks/useSenderNames'
import type { Account } from '../../types'
import { EmojiPicker } from '../chat/EmojiPicker'
import { PanelError } from '../settings/PanelError'
import { PanelSkeleton } from '../settings/PanelSkeleton'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function ChannelPostModal({ account, post, onClose }: { account: Account; post: ChannelPost; onClose: () => void }) {
  const { t } = useTranslation()
  const fail = useActionReporter('channel-reactions')
  const load = useCallback(async (current: Account) => {
    const [detail, reactions] = await Promise.all([getChannelPost(current, post.id), listPostReactions(current, post.id)])
    return { detail, reactions }
  }, [post.id])
  const data = useAccountResource(account, load, post.id)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function react(emoji: string | null): Promise<void> {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      if (emoji === null) await removePostReaction(account, post.id)
      else await addPostReaction(account, post.id, emoji)
      data.reload()
    } catch (cause) { fail(cause) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Modal open title={t('channelFeed.post')} onClose={onClose}>
    <div className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{data.data?.detail.text ?? post.text}</p>
      {(data.data?.detail.attachmentIds ?? post.attachmentIds).map((id, index) => <ChannelAttachment key={id} account={account} attachmentId={id} index={index + 1} />)}
      <div className="flex items-center gap-2">
        <EmojiPicker disabled={busy} onPick={(emoji) => { void react(emoji) }} />
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { void react(null) }}>{t('channelFeed.removeReaction')}</Button>
      </div>
      {data.error ? <PanelError message={data.error} onRetry={data.reload} /> : data.data === null ? <PanelSkeleton /> : <>
        <ReactionPages account={account} postId={post.id} firstPage={data.data.reactions} />
      </>}
    </div>
  </Modal>
}

function ReactionPages({ account, postId, firstPage }: { account: Account; postId: string; firstPage: PostReaction[] }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState(firstPage)
  const [last, setLast] = useState(firstPage.at(-1))
  const [hasOlder, setHasOlder] = useState(firstPage.length >= REACTIONS_PAGE_SIZE)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const names = useSenderNames(account, rows.filter((row) => row.actorType === 'account').map((row) => row.actorId), rows.length)
  async function more(): Promise<void> {
    if (lock.current || !last || !hasOlder) return
    lock.current = true; setBusy(true)
    try {
      const page = await listPostReactions(account, postId, { beforeCreatedAt: last.createdAt, beforeActorId: last.actorId })
      if (!active.current) return
      setRows((current) => [...new Map([...page, ...current].map((row) => [`${row.actorType}:${row.actorId}`, row])).values()]
        .sort((a, b) => b.createdAt - a.createdAt || b.actorId.localeCompare(a.actorId)))
      setLast(page.at(-1)); setHasOlder(page.length >= REACTIONS_PAGE_SIZE); setError(null)
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally { lock.current = false; if (active.current) setBusy(false) }
  }
  return <>
    {rows.length === 0 ? <p className="text-sm text-fg-muted">{t('channelFeed.noReactions')}</p> : null}
    <ul className="flex flex-col gap-2">{rows.map((reaction) => <li key={`${reaction.actorType}:${reaction.actorId}`} className="flex min-w-0 items-center gap-3 text-sm">
      <span className="emoji text-xl">{reaction.emoji}</span>
      <span className="truncate">{reaction.actorType === 'bot' ? t('bots.title') : names.get(reaction.actorId) ?? t('chatList.unknownPeer')}</span>
    </li>)}</ul>
    {error ? <PanelError message={error} onRetry={() => { void more() }} /> : null}
    {hasOlder ? <Button size="sm" variant="secondary" className="self-start" loading={busy} onClick={() => { void more() }}>{t('channelFeed.moreReactions')}</Button> : null}
  </>
}
