import { useStore } from 'zustand'
import { uploadChannelAttachment } from '../attachments/channel'
import { ChannelAttachment } from '../components/conversation/ChannelAttachment'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { canPublish, getChannel } from '../api/channels'
import { createChannelPost, deleteChannelPost, editChannelPost, getPostDiscussion, listChannelPosts, listPinnedPosts, pinChannelPost, unpinChannelPost, type ChannelPost } from '../api/channel_posts'
import { ConversationProfileModal } from '../components/profile/ConversationProfileModal'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PanelError } from '../components/settings/PanelError'
import { PanelSkeleton } from '../components/settings/PanelSkeleton'
import { ChannelPostModal } from '../components/conversation/ChannelPostModal'
import { useAccountResource } from '../hooks/useAccountResource'
import { useActionReporter } from '../hooks/useActionReporter'
import { useSenderNames } from '../hooks/useSenderNames'
import { chatPath, conversationSettingsPath, ROUTES } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import { channelFeedKey, EMPTY_CHANNEL_POSTS, useChannelPostsStore } from '../state/channelPostsStore'
import type { ConversationRecord } from '../storage/db'
import type { Account } from '../types'
import { formatFullTimestamp } from '../utils/chatTime'
import { describeCause } from '../utils/errors'

export function ChannelScreen({ account, conversation, avatarUrl }: { account: Account; conversation: ConversationRecord; avatarUrl: string | null }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const fail = useActionReporter('channel-posts')
  const channelId = conversation.id
  const metadataVersion = useStore(requireAccountStore(account.id), (state) => state.conversationVersions[channelId] ?? 0)
  const refreshVersion = useChannelPostsStore((state) => state.refreshVersions[account.id] ?? 0)
  const load = useCallback(async (current: Account) => {
    const snapshot = useChannelPostsStore.getState().feeds[channelFeedKey(current.id, channelId)] ?? EMPTY_CHANNEL_POSTS
    const [posts, pinned, publish, detail] = await Promise.all([listChannelPosts(current, channelId), listPinnedPosts(current, channelId), canPublish(current, channelId), getChannel(current, channelId)])
    return { posts, pinned, publish, detail, snapshot }
  }, [channelId])
  const resource = useAccountResource(account, load, `${channelId}:${metadataVersion}:${refreshVersion}`)
  const cached = useChannelPostsStore((state) => state.feeds[channelFeedKey(account.id, channelId)] ?? EMPTY_CHANNEL_POSTS)
  const posts = [...new Map([...(resource.data?.posts ?? []), ...cached].map((post) => [post.id, post])).values()].sort((a, b) => b.id.localeCompare(a.id))
  const names = useSenderNames(account, posts.filter((post) => post.authorType === 'account').map((post) => post.authorId), 200)
  const [older, setOlder] = useState<{ before: string; done: boolean } | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const uploads = useRef(new Map<File, string>())
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState<ChannelPost | null>(null)
  const [deleting, setDeleting] = useState<ChannelPost | null>(null)
  const [detailPost, setDetailPost] = useState<ChannelPost | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const canPost = resource.data?.publish === true
  const owner = resource.data?.detail.ownerAccountId === account.id
  const title = resource.data?.detail.title ?? conversation.title ?? t('chatList.unknownPeer')

  const newestId = posts[0]?.id
  useEffect(() => {
    if (!resource.data) return
    useChannelPostsStore.getState().reconcile(account.id, channelId, resource.data.posts, resource.data.snapshot)
  }, [account.id, channelId, resource.data])
  useEffect(() => {
    if (newestId) void requireAccountStore(account.id).getState().actions.markRead(channelId)
  }, [account.id, channelId, newestId])
  const reload = resource.reload
  // Refresh after returning to the tab: edits/deletes have no dedicated WS event.
  useEffect(() => {
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  async function mutate(work: () => Promise<void>): Promise<void> {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await work() } catch (cause) { fail(cause) }
    finally { lock.current = false; setBusy(false) }
  }
  async function submit(): Promise<void> {
    const text = value.trim()
    if (!text || [...text].length > 4096) return
    await mutate(async () => {
      if (editing) {
        await editChannelPost(account, editing.id, text)
        useChannelPostsStore.getState().merge(account.id, channelId, [{ ...editing, text, editedAt: Math.floor(Date.now() / 1000) }], true)
      } else {
        const attachmentIds: string[] = []
        for (const [index, file] of files.entries()) {
          let id = uploads.current.get(file)
          if (!id) {
            id = await uploadChannelAttachment(account, channelId, file, (fraction) => setProgress(Math.round(100 * (index + fraction) / files.length)))
            uploads.current.set(file, id)
          }
          attachmentIds.push(id)
        }
        const post = await createChannelPost(account, channelId, { text, attachmentIds, replyToPostId: null, forwardFrom: null })
        uploads.current.clear(); setFiles([]); setProgress(0)
        useChannelPostsStore.getState().merge(account.id, channelId, [post], true)
      }
      setValue(''); setEditing(null)
      requireAccountStore(account.id).setState((state) => ({ messagesVersion: state.messagesVersion + 1 }))
    })
  }
  async function more(): Promise<void> {
    await mutate(async () => {
      try {
        const cursor = older?.before ?? resource.data?.posts.at(-1)?.id
        if (!cursor) return
        const snapshot = useChannelPostsStore.getState().feeds[channelFeedKey(account.id, channelId)] ?? EMPTY_CHANNEL_POSTS
        const rows = await listChannelPosts(account, channelId, { before: cursor })
        useChannelPostsStore.getState().reconcile(account.id, channelId, rows, snapshot, cursor)
        setOlder({ before: rows.at(-1)?.id ?? cursor, done: rows.length < 50 })
        setPageError(null)
      } catch (cause) { setPageError(describeCause(cause)) }
    })
  }
  const pinned = resource.data?.pinned ?? []
  return <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
    <ScreenHeader title={title} subtitle={t('channelFeed.title')} onBack={() => { void navigate(ROUTES.app) }}
      actions={<Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)}>{t('channelFeed.profile')}</Button>} />
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        {resource.error ? <PanelError message={resource.error} onRetry={resource.reload} /> : null}
        {resource.data === null && !resource.error ? <PanelSkeleton /> : null}
        {pinned.length ? <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
          <p className="text-xs font-medium text-fg-muted">{t('channelFeed.pinned')}</p>
          {pinned.map((post) => <button key={post.id} className="truncate text-left text-sm text-accent" onClick={() => setDetailPost(post)}>{post.text}</button>)}
        </div> : null}
        {resource.data && posts.length === 0 ? <p className="py-8 text-center text-sm text-fg-muted">{t('channelFeed.empty')}</p> : null}
        {posts.map((post) => <article key={post.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-bg-elevated p-4">
          <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
            <span className="truncate">{post.authorType === 'bot' ? t('bots.title') : names.get(post.authorId) ?? t('chatList.unknownPeer')}</span>
            <time className="shrink-0">{formatFullTimestamp(post.createdAt, i18n.language)}{post.editedAt ? ` · ${t('channelFeed.edited')}` : ''}</time>
          </div>
          <button type="button" className="whitespace-pre-wrap break-words text-left text-sm [overflow-wrap:anywhere]" onClick={() => setDetailPost(post)}>{post.text}</button>
          {post.attachmentIds.map((id, index) => <ChannelAttachment key={id} account={account} attachmentId={id} index={index + 1} />)}
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDetailPost(post)}>{t('channelFeed.reactions')}</Button>
            {resource.data?.detail.linkedGroupConversationId ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => { void mutate(async () => {
              const discussion = await getPostDiscussion(account, post.id)
              if (discussion.linkedGroupId) { await requireAccountStore(account.id).getState().actions.loadConversations(); void navigate(chatPath(discussion.linkedGroupId)) }
            }) }}>{t('channelFeed.discussion', { count: post.discussionCommentCount })}</Button> : null}
            {canPost || (post.pinnedAt && post.authorType === 'account' && post.authorId === account.id) ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => { void mutate(async () => {
              if (post.pinnedAt) await unpinChannelPost(account, post.id); else await pinChannelPost(account, post.id)
              useChannelPostsStore.getState().merge(account.id, channelId, [{ ...post, pinnedAt: post.pinnedAt ? null : Math.floor(Date.now() / 1000) }], true)
              resource.reload()
            }) }}>{t(post.pinnedAt ? 'channelFeed.unpin' : 'channelFeed.pin')}</Button> : null}
            {post.authorType === 'account' && post.authorId === account.id ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setEditing(post); setValue(post.text) }}>{t('channelFeed.edit')}</Button> : null}
            {owner || (post.authorType === 'account' && post.authorId === account.id) ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(post)}>{t('channelFeed.delete')}</Button> : null}
          </div>
        </article>)}
        {pageError ? <PanelError message={pageError} onRetry={() => { void more() }} /> : null}
        {resource.data && !older?.done && resource.data.posts.length >= 50 ? <Button variant="secondary" size="sm" loading={busy} onClick={() => { void more() }}>{t('channelFeed.older')}</Button> : null}
        {resource.data ? <Button variant="ghost" size="sm" disabled={busy} onClick={resource.reload}>{t('channelFeed.refresh')}</Button> : null}
      </div>
    </div>
    {canPost || editing ? <form className="flex flex-col gap-2 border-t border-border p-3" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      <label className="text-xs text-fg-muted" htmlFor="channel-post-text">{t(editing ? 'channelFeed.edit' : 'channelFeed.compose')}</label>
      <textarea id="channel-post-text" value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} rows={3}
        className="max-h-40 w-full resize-y rounded-lg border border-border bg-bg-elevated p-3 text-sm focus-visible:outline-2 focus-visible:outline-accent" />
      {!editing ? <>
        <p className="text-xs text-fg-muted">{t('channelFeed.publicHint')}</p>
        <input ref={fileRef} type="file" multiple hidden disabled={busy} onChange={(event) => {
          const added = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length + added.length > 10) { fail(new Error(t('channelFeed.fileLimit'))); return }
          setFiles((current) => [...current, ...added])
        }} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={busy || files.length >= 10} onClick={() => fileRef.current?.click()}>{t('channelFeed.attach')}</Button>
          {files.map((file, index) => <Button key={index} className="max-w-full" size="sm" variant="ghost" disabled={busy} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}><span className="truncate">{file.name}</span> ×</Button>)}
          {busy && files.length > 0 ? <span role="status" className="text-xs text-fg-muted">{progress}%</span> : null}
        </div>
      </> : null}
      <div className="flex items-center gap-2">
        <Button size="sm" loading={busy} disabled={!value.trim() || [...value.trim()].length > 4096} type="submit">{t(editing ? 'channelFeed.save' : 'channelFeed.publish')}</Button>
        {editing ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(null); setValue('') }}>{t('common.cancel')}</Button> : null}
        <span className="ml-auto text-xs text-fg-muted">{[...value.trim()].length}/4096</span>
      </div>
    </form> : null}
    <ConversationProfileModal open={profileOpen} account={account} conversation={conversation} avatarUrl={avatarUrl} onClose={() => setProfileOpen(false)}
      onOpenSettings={() => { void navigate(conversationSettingsPath(channelId)) }} onLeft={() => { void navigate(ROUTES.app) }} />
    {detailPost ? <ChannelPostModal key={detailPost.id} account={account} post={detailPost} onClose={() => setDetailPost(null)} /> : null}
    <ConfirmDialog open={deleting !== null} title={t('channelFeed.delete')} description={t('channelFeed.deleteHint')} confirmLabel={t('channelFeed.delete')} danger busy={busy}
      onClose={() => { if (!lock.current) setDeleting(null) }} onConfirm={() => { void mutate(async () => {
        if (!deleting) return
        await deleteChannelPost(account, deleting.id)
        useChannelPostsStore.getState().remove(account.id, channelId, deleting.id)
        if (editing?.id === deleting.id) { setEditing(null); setValue('') }
        setDeleting(null); resource.reload()
      }) }} />
  </div>
}
