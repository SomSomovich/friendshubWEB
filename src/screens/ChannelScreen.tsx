import { useStore } from 'zustand'
import { uploadChannelAttachment } from '../attachments/channel'
import { releasePending, type PendingAttachment } from '../attachments/prepare'
import type { UploadProgress } from '../attachments/send'
import { AttachmentComposer } from '../components/chat/AttachmentComposer'
import { MessageComposer } from '../components/chat/MessageComposer'
import { fileToWebp, MESSAGE_IMAGE } from '../utils/image'
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
  const [files, setFiles] = useState<PendingAttachment[]>([])
  const pendingFiles = useRef<PendingAttachment[]>([])
  const uploads = useRef(new Map<string, string>())
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [caption, setCaption] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
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

  useEffect(() => () => { pendingFiles.current.forEach(releasePending) }, [])

  async function mutate(work: () => Promise<void>, rethrow = false): Promise<void> {
    if (lock.current) {
      if (rethrow) throw new Error(t('chat.actionFailed'))
      return
    }
    lock.current = true; setBusy(true)
    try { await work() } catch (cause) { fail(cause); if (rethrow) throw cause }
    finally { lock.current = false; setBusy(false) }
  }
  async function submit(input: string): Promise<void> {
    const text = input.trim()
    if (!text || [...text].length > 4096) {
      const cause = new Error(t('channelFeed.textLimit'))
      fail(cause); throw cause
    }
    await mutate(async () => {
      if (editing) {
        await editChannelPost(account, editing.id, text)
        useChannelPostsStore.getState().merge(account.id, channelId, [{ ...editing, text, editedAt: Math.floor(Date.now() / 1000) }], true)
      } else {
        const post = await createChannelPost(account, channelId, { text, attachmentIds: [], replyToPostId: null, forwardFrom: null })
        useChannelPostsStore.getState().merge(account.id, channelId, [post], true)
      }
      if (!editing) setValue('')
      setEditing(null)
      requireAccountStore(account.id).setState((state) => ({ messagesVersion: state.messagesVersion + 1 }))
    }, true)
  }
  function replaceFiles(next: PendingAttachment[]): void {
    pendingFiles.current = next
    setFiles(next)
  }
  function clearFiles(): void {
    pendingFiles.current.forEach(releasePending)
    replaceFiles([]); uploads.current.clear(); setCaption(''); setUploadError(null); setProgress(null)
  }
  function addFile(file: File): PendingAttachment | null {
    if (busy || !canPost) return null
    if (pendingFiles.current.length >= 10) { fail(new Error(t('channelFeed.fileLimit'))); return null }
    const pending: PendingAttachment = { id: crypto.randomUUID(), blob: file, name: file.name,
      compress: false, compressedSize: null, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }
    replaceFiles([...pendingFiles.current, pending])
    return pending
  }
  async function sendFiles(input = caption): Promise<void> {
    const batch = [...pendingFiles.current]
    if (batch.length === 0 || lock.current) return
    const text = input.trim() || (batch.every((file) => file.blob.type.startsWith('audio/')) ? t('channelFeed.voiceMessage') : t('chat.attach.file'))
    if ([...text].length > 4096) { setUploadError(t('channelFeed.textLimit')); return }
    setUploadError(null)
    await mutate(async () => {
      try {
        const attachmentIds: string[] = []
        for (const [index, file] of batch.entries()) {
          const key = `${file.id}:${file.compress}`
          let id = uploads.current.get(key)
          setProgress({ fileIndex: index, fileCount: batch.length, fraction: 0 })
          if (!id) {
            const blob = file.compress && file.blob.type.startsWith('image/')
              ? new Blob([(await fileToWebp(new File([file.blob], file.name), MESSAGE_IMAGE)).slice()], { type: 'image/webp' }) : file.blob
            id = await uploadChannelAttachment(account, channelId, blob, (fraction) => setProgress({ fileIndex: index, fileCount: batch.length, fraction }))
            uploads.current.set(key, id)
          }
          attachmentIds.push(id)
        }
        const post = await createChannelPost(account, channelId, { text, attachmentIds, replyToPostId: null, forwardFrom: null })
        useChannelPostsStore.getState().merge(account.id, channelId, [post], true)
        requireAccountStore(account.id).setState((state) => ({ messagesVersion: state.messagesVersion + 1 }))
        clearFiles()
      } catch (cause) { setUploadError(describeCause(cause)); setProgress(null); throw cause }
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
            {post.authorType === 'account' && post.authorId === account.id ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(post)}>{t('channelFeed.edit')}</Button> : null}
            {owner || (post.authorType === 'account' && post.authorId === account.id) ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(post)}>{t('channelFeed.delete')}</Button> : null}
          </div>
        </article>)}
        {pageError ? <PanelError message={pageError} onRetry={() => { void more() }} /> : null}
        {resource.data && !older?.done && resource.data.posts.length >= 50 ? <Button variant="secondary" size="sm" loading={busy} onClick={() => { void more() }}>{t('channelFeed.older')}</Button> : null}
        {resource.data ? <Button variant="ghost" size="sm" disabled={busy} onClick={resource.reload}>{t('channelFeed.refresh')}</Button> : null}
      </div>
    </div>
    {canPost || editing ? <MessageComposer key={editing?.id ?? 'new-message'}
      initialDraft={value} onDraftChange={editing ? undefined : setValue}
      editing={editing ? { envelopeId: editing.id, text: editing.text } : null}
      onCancelEdit={() => setEditing(null)} onSubmitEdit={submit} onSend={submit}
      onPickFile={addFile} onVoiceRecorded={(blob, name) => {
        if (addFile(new File([blob], name, { type: blob.type }))) {
          const text = t('channelFeed.voiceMessage'); setCaption(text); void sendFiles(text)
        }
      }} disabled={busy || resource.data === null} focusToken={0} onTyping={() => {}} /> : null}
    <AttachmentComposer open={files.length > 0} attachments={files} caption={caption} onCaptionChange={setCaption}
      onToggleCompress={(id, compress) => replaceFiles(pendingFiles.current.map((file) => file.id === id ? { ...file, compress } : file))}
      onRemove={(id) => {
        const file = pendingFiles.current.find((entry) => entry.id === id)
        if (file) releasePending(file)
        replaceFiles(pendingFiles.current.filter((entry) => entry.id !== id))
      }} progress={progress} error={uploadError} onSend={() => { void sendFiles() }}
      onClose={() => { if (!lock.current) clearFiles() }} />
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
