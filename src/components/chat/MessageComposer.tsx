import { FileText, Image as ImageIcon, Mic, Paperclip, Send, Video, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'
import { DropdownMenu, type DropdownItem } from '../ui/DropdownMenu'

/** What the attachment menu offers. The pipeline behind it arrives in 4.9. */
export type AttachmentKind = 'photo' | 'video' | 'file'

export type EditingState = {
  envelopeId: string
  text: string
}

export type MessageComposerProps = {
  onSend: (text: string) => Promise<void>
  onPickFile: (file: File, kind: AttachmentKind) => void
  /** Non-null replaces the composer with the edit field for that message. */
  editing: EditingState | null
  onCancelEdit: () => void
  onSubmitEdit: (text: string) => Promise<void>
  /** Blocks sending while a conversation is still being read. */
  disabled: boolean
  /** Focuses the field when the search overlay closes. */
  focusToken: number
}

/** Grows to five lines, then scrolls. Must match `leading-5` below. */
const LINE_HEIGHT_PX = 20
const MAX_ROWS = 5

export function MessageComposer({
  onSend,
  onPickFile,
  editing,
  onCancelEdit,
  onSubmitEdit,
  disabled,
  focusToken,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recordingToastRef = useRef<string | null>(null)

  // Seeded from the edit target and never synchronised afterwards: the caller
  // remounts this component when the target changes (its `key` carries the
  // envelope id), which is what refills the field without an effect that would
  // fight the user's typing.
  const [value, setValue] = useState(() => editing?.text ?? '')
  const [recording, setRecording] = useState(false)
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

  function handleFile(kind: AttachmentKind) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Cleared so picking the same file twice still fires a change event.
      event.target.value = ''
      if (file !== undefined) {
        onPickFile(file, kind)
      }
    }
  }

  const menuItems: DropdownItem[] = [
    { id: 'photo', label: t('chat.attach.photo'), icon: ImageIcon, onSelect: () => { pick('photo') } },
    { id: 'video', label: t('chat.attach.video'), icon: Video, onSelect: () => { pick('video') } },
    { id: 'file', label: t('chat.attach.file'), icon: FileText, onSelect: () => { pick('file') } },
  ]

  function startRecording(): void {
    if (recording) {
      return
    }
    setRecording(true)
    recordingToastRef.current = toast.notify({
      kind: 'info',
      message: t('chat.voice.recording'),
      // Held open until the finger is lifted; the default timeout would dismiss
      // a message that is still true.
      timeoutMs: 60_000,
    })
  }

  function stopRecording(): void {
    if (!recording) {
      return
    }
    setRecording(false)
    if (recordingToastRef.current !== null) {
      toast.dismiss(recordingToastRef.current)
      recordingToastRef.current = null
    }
    toast.notify({ kind: 'info', message: t('chat.voice.unavailable') })
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
        {editing === null ? (
          <DropdownMenu
            trigger={<Paperclip className="size-5" aria-hidden />}
            triggerLabel={t('chat.attach.label')}
            items={menuItems}
            align="start"
          />
        ) : null}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value)
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

        {value.trim().length > 0 ? (
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
            title={t('chat.voice.record')}
            aria-pressed={recording}
            disabled={disabled}
            onPointerDown={(event) => {
              // Captured so lifting the finger anywhere still ends the press,
              // and so a drag off the button does not leave it stuck.
              event.currentTarget.setPointerCapture(event.pointerId)
              startRecording()
            }}
            onPointerUp={stopRecording}
            onPointerCancel={stopRecording}
            className={cn(
              'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              recording
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
        className="hidden"
        onChange={handleFile('photo')}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFile('video')}
      />
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile('file')} />
    </div>
  )
}
