import { Bot, Send } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import { getBotInfo, listBotMessages, sendBotMessage, type BotMessage } from '../api/bots'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PanelError } from '../components/settings/PanelError'
import { describeCause } from '../utils/errors'
import { PanelSkeleton } from '../components/settings/PanelSkeleton'
import { useActionReporter } from '../hooks/useActionReporter'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { ROUTES } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import type { Account } from '../types'
import { formatMessageTime } from '../utils/chatTime'
import { cn } from '../utils/cn'

/**
 * A thread with a bot.
 *
 * Not a conversation and not written like one: there are no envelopes, no
 * members and no sender devices, so none of the chat machinery applies. The
 * history comes from an endpoint of its own and a reply arrives as its own
 * server frame — see `src/api/bots.ts`.
 */
export function BotChatScreen() {
  const { id } = useParams<{ id: string }>()
  const account = useActiveAccount()

  if (id === undefined || account === null) {
    return null
  }
  return <BotThread key={`${account.id}:${id}`} account={account} botId={id} />
}

function BotThread({ account, botId }: { account: Account; botId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fail = useActionReporter('bots')
  const store = requireAccountStore(account.id)

  const messages = useStore(store, (state) => state.botThreads[botId] ?? EMPTY_THREAD)
  const [handle, setHandle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const olderScroll = useRef<{ height: number; top: number } | null>(null)
  const [before, setBefore] = useState<number | null>(null)
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const loadingOlderRef = useRef(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [info, history] = await Promise.all([
          getBotInfo(account, botId),
          listBotMessages(account, botId, { limit: 100 }),
        ])
        if (cancelled) {
          return
        }
        setHandle(info.handle)
        setBefore(history.at(-1)?.createdAt ?? null)
        setHasOlder(history.length >= 100)
        setLoadError(null)
        store.getState().actions.setBotThread(botId, history)
      } catch (error) {
        if (!cancelled) {
          fail(error)
          setLoadError(describeCause(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [account, botId, store, fail, revision])

  // A bot answers when it answers; the thread follows the newest message rather
  // than making the reader scroll for it.
  useEffect(() => {
    if (olderScroll.current === null && !loadingOlderRef.current) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  useLayoutEffect(() => {
    const saved = olderScroll.current
    const viewport = viewportRef.current
    if (saved !== null && viewport !== null && !loadingOlder) {
      viewport.scrollTop = saved.top + viewport.scrollHeight - saved.height
      olderScroll.current = null
    }
  }, [messages.length, loadingOlder])

  async function loadOlder(): Promise<void> {
    if (loadingOlderRef.current || before === null || !hasOlder) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    const viewport = viewportRef.current
    if (viewport !== null) olderScroll.current = { height: viewport.scrollHeight, top: viewport.scrollTop }
    try {
      const history = await listBotMessages(account, botId, { before, limit: 100 })
      store.getState().actions.setBotThread(botId, history)
      setBefore(history.at(-1)?.createdAt ?? null)
      setHasOlder(history.length >= 100)
    } catch (cause) { fail(cause) }
    finally { loadingOlderRef.current = false; setLoadingOlder(false) }
  }

  async function submit(): Promise<void> {
    const text = value.trim()
    if ([...text].length === 0 || [...text].length > 4096 || sending) {
      return
    }

    setSending(true)
    try {
      const sent = await sendBotMessage(account, botId, { text })
      store.getState().actions.appendBotMessage(botId, sent)
      setValue('')
    } catch (error) {
      fail(error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={handle === null ? t('bots.title') : `@${handle}`}
        subtitle={t('bots.subtitle')}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        backMode="always"
      />

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <PanelSkeleton rows={4} />
        ) : loadError !== null ? (
          <PanelError message={loadError} onRetry={() => { setLoading(true); setRevision((current) => current + 1) }} />
        ) : messages.length === 0 ? (
          <EmptyState icon={Bot} title={t('bots.empty')} description={t('bots.emptyHint')} />
        ) : (
          <ol className="mx-auto flex w-full max-w-xl flex-col gap-1.5">
            {hasOlder ? <li className="self-center"><Button variant="secondary" size="sm" loading={loadingOlder} onClick={() => { void loadOlder() }}>{t('bots.older')}</Button></li> : null}
            {messages.map((message) => (
              <BotBubble key={message.id} message={message} botHandle={handle} />
            ))}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-bg-elevated p-2">
        <textarea
          rows={1}
          maxLength={4096}
          value={value}
          disabled={loading}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder={t('bots.placeholder')}
          aria-label={t('bots.placeholder')}
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-5 text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        />
        <Button
          aria-label={t('chat.send')}
          loading={sending}
          disabled={value.trim().length === 0 || [...value.trim()].length > 4096 || loading}
          onClick={() => {
            void submit()
          }}
        >
          <Send className="size-5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/** Shared so an absent thread does not allocate a new array on every render. */
const EMPTY_THREAD: BotMessage[] = []

function BotBubble({ message, botHandle }: { message: BotMessage; botHandle: string | null }) {
  const fromBot = message.direction === 'from_bot'

  return (
    <li className={cn('flex', fromBot ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm text-fg sm:max-w-[70%]',
          fromBot ? 'bg-bg-elevated' : 'bg-accent/20 ring-1 ring-accent/30',
        )}
      >
        {fromBot && botHandle !== null ? (
          <p className="mb-0.5 text-xs font-semibold text-accent">@{botHandle}</p>
        ) : null}
        <p className="text-pretty whitespace-pre-wrap break-words">{message.text}</p>
        <p className="mt-1 text-right text-[11px] leading-none text-fg-muted tabular-nums">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </li>
  )
}
