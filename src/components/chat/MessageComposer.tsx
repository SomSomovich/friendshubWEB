import { FileText, Image as ImageIcon, Mic, Paperclip, Send, Trash2, Video, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { cn } from '../../utils/cn'
import { formatClipDuration } from '../../utils/duration'
import { DropdownMenu, type DropdownItem } from '../ui/DropdownMenu'

/** What the attachment menu offers. */
export type AttachmentKind = 'photo' | 'video' | 'file'

export type EditingState = {
  envelopeId: string
  text: string
}

export type MessageComposerProps = {
  onSend: (text: string) => Promise<void>
  /** Every file the picker returned, on its way to the preview overlay. */
  onPickFile: (file: File) => void
  /** A finished voice recording, on its way to the same overlay. */
  onVoiceRecorded: (blob: Blob, name: string) => void
  /** Non-null replaces the composer with the edit field for that message. */
  editing: EditingState | null
  onCancelEdit: () => void
  onSubmitEdit: (text: string) => Promise<void>
  /** Blocks sending while a conversation is still being read. */
  disabled: boolean
  /** Called on a keystroke that adds text; the caller throttles it. */
  onTyping: () => void
  /** Focuses the field when the search overlay closes. */
  focusToken: number
}

/** How far left the finger has to travel to take the recording back. */
const SWIPE_CANCEL_PX = -60

/** Grows to five lines, then scrolls. Must match `leading-5` below. */
const LINE_HEIGHT_PX = 20
const MAX_ROWS = 5

export function MessageComposer({
  onSend,
  onPickFile,
  onVoiceRecorded,
  editing,
  onCancelEdit,
  onSubmitEdit,
  disabled,
  focusToken,
  onTyping,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const voice = useVoiceRecorder()
  /** Where the press started, and whether it has slid far enough to be undone. */
  const dragRef = useRef<{ x: number; cancel: boolean } | null>(null)
  /** True between the press and the release, across the microphone's own delay. */
  const pressingRef = useRef(false)

  // Seeded from the edit target and never synchronised afterwards: the caller
  // remounts this component when the target changes (its `key` carries the
  // envelope id), which is what refills the field without an effect that would
  // fight the user's typing.
  const [value, setValue] = useState(() => editing?.text ?? '')
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    const element = textareaRef.current
    if (element === null) {
      return
    }
    // Reset first: shrinking needs the browser to forget the previous height.
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [value])

  useEffect(() => {
    if (focusToken > 0) {
      textareaRef.current?.focus()
    }
  }, [focusToken])

  const canSend = value.trim().length > 0 && !disabled && !busy

  async function submit(): Promise<void> {
    const text = value.trim()
    if (text.length === 0 || disabled || busy) {
      return
    }

    setBusy(true)
    try {
      if (editing === null) {
        await onSend(text)
      } else {
        await onSubmitEdit(text)
      }
      setValue('')
    } catch (error) {
      // The toast is raised by the caller; keeping the text lets the user retry
      // without retyping it.
      console.error('[chat] the message was not sent', error)
    } finally {
      setBusy(false)
    }
  }

  function pick(kind: AttachmentKind): void {
    const input =
      kind === 'photo' ? photoRef.current : kind === 'video' ? videoRef.current : fileRef.current
    input?.click()
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>): void {
    // Every file it was given, not just the first: choosing a set of photos is
    // one gesture, and asking for them one at a time is not the same thing.
    const files = [...(event.target.files ?? [])]
    // Cleared so picking the same file twice still fires a change event.
    event.target.value = ''
    files.forEach(onPickFile)
  }

  const menuItems: DropdownItem[] = [
    { id: 'photo', label: t('chat.attach.photo'), icon: ImageIcon, onSelect: () => { pick('photo') } },
    { id: 'video', label: t('chat.attach.video'), icon: Video, onSelect: () => { pick('video') } },
    { id: 'file', label: t('chat.attach.file'), icon: FileText, onSelect: () => { pick('file') } },
  ]

  async function beginRecording(event: PointerEvent<HTMLButtonElement>): Promise<void> {
    // Captured so lifting the finger anywhere still ends the press, and so a
    // drag off the button is seen rather than lost. Guarded because the pointer
    // can already be gone — a capture request against a pointer the browser has
    // released throws, and that throw used to abort the recording before it
    // started, leaving the press doing nothing at all.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch (error) {
      console.warn('[voice] the pointer could not be captured for the recording', error)
    }

    pressingRef.current = true
    dragRef.current = { x: event.clientX, cancel: false }
    await voice.start()

    // The finger may already be up. Opening the microphone is not instant, and
    // the first time it is a permission prompt, which is not instant at all —
    // the release ran while there was still no recorder for it to stop. What
    // was captured in the meantime is discarded rather than sent: nobody heard
    // themselves record it.
    if (!pressingRef.current) {
      voice.cancel()
      dragRef.current = null
    }
  }

  function trackDrag(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current
    if (drag === null || drag.cancel) {
      return
    }
    // Sliding away from the microphone is the gesture every messenger uses to
    // take a recording back, and it is the one a thumb can make.
    if (event.clientX - drag.x < SWIPE_CANCEL_PX) {
      drag.cancel = true
      voice.cancel()
    }
  }

  async function endRecording(): Promise<void> {
    pressingRef.current = false
    const drag = dragRef.current
    dragRef.current = null

    if (drag?.cancel === true) {
      voice.cancel()
      return
    }

    const blob = await voice.finish()
    if (blob === null) {
      // Too short, or the microphone never opened. Saying nothing is right: a
      // mis-tap produced nothing, and an error for one is noise.
      return
    }
    onVoiceRecorded(blob, `voice-${Date.now()}.${extensionFor(blob.type)}`)
  }

  return (
    <div className="shrink-0 border-t border-border bg-bg-elevated">
      {editing === null ? null : (
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">
            {t('chat.edit.banner')}
          </span>
          <button
            type="button"
            aria-label={t('chat.edit.cancel')}
            onClick={onCancelEdit}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1 p-2">
        {editing === null && !voice.recording ? (
          <DropdownMenu
            trigger={<Paperclip className="size-5" aria-hidden />}
            triggerLabel={t('chat.attach.label')}
            items={menuItems}
            align="start"
          />
        ) : null}

        {voice.recording ? (
          <span className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-danger/50 bg-bg px-3 text-sm text-fg">
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
            <span className="shrink-0 tabular-nums">{formatClipDuration(voice.seconds)}</span>
            <span className="truncate text-xs text-fg-muted">{t('chat.voice.recordingHint')}</span>
            <button
              type="button"
              aria-label={t('chat.voice.cancel')}
              onClick={voice.cancel}
              className="ml-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </span>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              setValue(event.target.value)
              // Only forward: deleting is not typing, and reporting it would keep
              // the indicator alive while the field empties.
              if (event.target.value.length > value.length) {
                onTyping()
              }
            }}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line. An IME composition is
              // still typing, so Enter there must not send anything.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder={t('chat.composerPlaceholder')}
            aria-label={t('chat.composerPlaceholder')}
            style={{ maxHeight: `${LINE_HEIGHT_PX * MAX_ROWS + 16}px` }}
            className={cn(
              'min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-5 text-fg',
              'overflow-y-auto placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        )}

        {/* The microphone stays mounted for the whole press, which is the hinge
            of the gesture: it holds the pointer capture, and unmounting it the
            moment the recorder starts was what swallowed the release and left
            the recording running with nothing but the bin to stop it. */}
        {value.trim().length > 0 && !voice.recording ? (
          <button
            type="button"
            aria-label={editing === null ? t('chat.send') : t('chat.edit.save')}
            title={editing === null ? t('chat.send') : t('chat.edit.save')}
            disabled={!canSend}
            onClick={() => {
              void submit()
            }}
            className={cn(
              'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg transition-[filter] duration-150',
              'hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
            )}
          >
            <Send className="size-5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t('chat.voice.record')}
            title={t('chat.voice.recordHint')}
            aria-pressed={voice.recording}
            disabled={disabled}
            onPointerDown={(event) => {
              void beginRecording(event)
            }}
            onPointerMove={trackDrag}
            onPointerUp={() => {
              void endRecording()
            }}
            onPointerCancel={() => {
              pressingRef.current = false
              voice.cancel()
              dragRef.current = null
            }}
            className={cn(
              'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              voice.recording
                ? 'bg-danger text-danger-fg'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            <Mic className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFile}
      />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
    </div>
  )
}

/** The container a recording came out as, for the file it is named after. */
function extensionFor(mimeType: string): string {
  if (mimeType.includes('ogg')) {
    return 'ogg'
  }
  return mimeType.includes('mp4') ? 'm4a' : 'webm'
}

