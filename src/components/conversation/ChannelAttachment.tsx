import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadChannelAttachment } from '../../attachments/channel'
import { displayName, formatBytes } from '../../attachments/display'
import { detectMime, type AttachmentMime } from '../../attachments/mime'
import { useActionReporter } from '../../hooks/useActionReporter'
import type { Account } from '../../types'
import { AttachmentViewer } from '../chat/AttachmentViewer'
import { Button } from '../ui/Button'

type Loaded = { url: string; mime: AttachmentMime; size: number }
export function ChannelAttachment({ account, attachmentId, index }: { account: Account; attachmentId: string; index: number }) {
  const { t } = useTranslation()
  const fail = useActionReporter('channel-attachment')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState(false)
  const lock = useRef(false)
  const lifetime = useRef({ alive: true, url: '' })
  useEffect(() => {
    const owner = { alive: true, url: '' }
    lifetime.current = owner
    return () => { owner.alive = false; if (owner.url) URL.revokeObjectURL(owner.url) }
  }, [])
  async function load(): Promise<void> {
    if (lock.current) return
    lock.current = true; setBusy(true)
    const owner = lifetime.current
    try {
      const bytes = await downloadChannelAttachment(account, attachmentId)
      if (!owner.alive) return
      const mime = detectMime(bytes)
      const url = URL.createObjectURL(new Blob([bytes], { type: mime.type }))
      owner.url = url
      setLoaded({ url, mime, size: bytes.length })
    } catch (cause) { if (owner.alive) fail(cause) }
    finally { lock.current = false; if (owner.alive) setBusy(false) }
  }
  return <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-2">
    {loaded ? <>
      {loaded.mime.family === 'image' ? <button onClick={() => setView(true)} type="button"><img src={loaded.url} alt={t('channelFeed.file', { index })} className="max-h-80 max-w-full rounded-lg object-contain" /></button> : null}
      {loaded.mime.family === 'video' ? <video src={loaded.url} controls preload="metadata" className="max-h-80 w-full rounded-lg" /> : null}
      {loaded.mime.family === 'audio' ? <audio src={loaded.url} controls preload="metadata" className="w-full" /> : null}
      <a href={loaded.url} download={displayName(null, attachmentId, loaded.mime)} className="text-sm text-accent">{t('channelFeed.downloadFile', { index })} · {formatBytes(loaded.size)}</a>
    </> : <Button variant="secondary" size="sm" className="self-start" loading={busy} onClick={() => { void load() }}>{t('channelFeed.loadFile', { index })}</Button>}
    <AttachmentViewer open={view} url={loaded?.url ?? null} mime={loaded?.mime ?? null} onClose={() => setView(false)} />
  </div>
}
