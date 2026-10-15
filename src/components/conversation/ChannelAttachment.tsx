import { Download, FileText, Loader2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadChannelAttachment } from '../../attachments/channel'
import { displayName, formatBytes } from '../../attachments/display'
import { detectMime, type AttachmentMime } from '../../attachments/mime'
import { useActionReporter } from '../../hooks/useActionReporter'
import type { Account } from '../../types'
import { AttachmentViewer } from '../chat/AttachmentViewer'
import { VoiceMessagePlayer } from '../chat/VoiceMessagePlayer'

type Loaded = { url: string; mime: AttachmentMime; size: number }

/** Public channel bytes use the same media treatment as an ordinary chat attachment. */
export function ChannelAttachment({ account, attachmentId, index }: { account: Account; attachmentId: string; index: number }) {
  const { t } = useTranslation()
  const fail = useActionReporter('channel-attachment')
  const [state, setState] = useState<{ status: 'loading' } | { status: 'ready'; value: Loaded } | { status: 'error'; message: string }>({ status: 'loading' })
  const [view, setView] = useState(false)
  const lifetime = useRef({ alive: true, url: '' })
  const loading = useRef(false)

  const load = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const bytes = await downloadChannelAttachment(account, attachmentId)
      if (!lifetime.current.alive) return
      const mime = detectMime(bytes)
      const url = URL.createObjectURL(new Blob([bytes], { type: mime.type }))
      lifetime.current.url = url
      setState({ status: 'ready', value: { url, mime, size: bytes.length } })
    } catch (cause) {
      if (lifetime.current.alive) {
        setState({ status: 'error', message: cause instanceof Error ? cause.message : String(cause) })
        fail(cause)
      }
    } finally {
      loading.current = false
    }
  }, [account, attachmentId, fail])

  useEffect(() => {
    lifetime.current = { alive: true, url: '' }
    void (async () => {
      await load()
    })()
    return () => {
      lifetime.current.alive = false
      if (lifetime.current.url) URL.revokeObjectURL(lifetime.current.url)
    }
  }, [load])

  if (state.status === 'loading') {
    return <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-bg-hover"><Loader2 className="size-5 animate-spin text-fg-muted" aria-hidden /></div>
  }

  if (state.status === 'error') {
    return <div className="flex h-20 w-48 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg px-2 text-center">
      <TriangleAlert className="size-4 text-fg-muted" aria-hidden />
      <span className="text-[11px] text-fg-muted">{t('chat.attach.unavailable')}</span>
    </div>
  }

  const { url, mime, size } = state.value
  if (mime.family === 'image') {
    return <>
      <button type="button" onClick={() => setView(true)} className="block cursor-pointer overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <img src={url} alt={t('channelFeed.file', { index })} className="max-h-72 max-w-full object-cover" />
      </button>
      <AttachmentViewer open={view} url={url} mime={mime} onClose={() => setView(false)} />
    </>
  }
  if (mime.family === 'video') {
    return <video src={url} controls preload="metadata" className="max-h-72 max-w-full rounded-lg bg-black" />
  }
  if (mime.family === 'audio') {
    return <VoiceMessagePlayer src={url} />
  }
  return <a href={url} download={displayName(null, attachmentId, mime)} className="flex w-56 max-w-full items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <FileText className="size-5 shrink-0 text-fg-muted" aria-hidden />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-xs text-fg">{displayName(null, attachmentId, mime)}</span>
      <span className="text-[11px] text-fg-muted tabular-nums">{formatBytes(size)}</span>
    </span>
    <Download className="size-4 shrink-0 text-fg-muted" aria-hidden />
  </a>
}
