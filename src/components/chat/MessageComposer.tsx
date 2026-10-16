import { CalendarClock, Camera, FileText, Image as ImageIcon, LoaderCircle, Mic, Paperclip, Send, SwitchCamera, Trash2, Video, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { useVideoCircleRecorder } from '../../hooks/useVideoCircleRecorder'
import { cn } from '../../utils/cn'
import { formatClipDuration } from '../../utils/duration'
import { DropdownMenu, type DropdownItem } from '../ui/DropdownMenu'
import { ContextMenu } from '../ui/ContextMenu'
import { DurationDialog } from '../ui/DurationDialog'
import { EmojiPicker } from './EmojiPicker'
import { CameraCaptureDialog } from './CameraCaptureDialog'

/** What the attachment menu offers. */
export type AttachmentKind = 'photo' | 'video' | 'file'

export type EditingState = {
  envelopeId: string
  text: string
}

export type MessageComposerProps = {
  onSend: (text: string) => Promise<void>
  onSchedule?: (text: string, delaySeconds: number) => Promise<void>
  scheduleWarningForSeconds?: (seconds: number) => string | null
  /** Every file the picker returned, on its way to the preview overlay. */
  onPickFile: (file: File) => void
  /** A finished voice recording, on its way to the same overlay. */
  onVoiceRecorded: (blob: Blob, name: string) => void
  /** Sends a finished video circle immediately through the attachment flow. */
  onVideoCircleRecorded: (blob: Blob, name: string) => Promise<void>
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
  /** Lets a transport-specific screen retain a draft while it refreshes. */
  initialDraft?: string
  onDraftChange?: (text: string) => void
}

/** Grows to five lines, then scrolls. Must match `leading-5` below. */
const LINE_HEIGHT_PX = 20
const MAX_ROWS = 5
const SCHEDULE_HOLD_MS = 500
const RECORD_HOLD_MS = 220
const LOCK_DRAG_PX = 80

export function MessageComposer({
  onSend,
  onSchedule,
  scheduleWarningForSeconds,
  onPickFile,
  onVoiceRecorded,
  onVideoCircleRecorded,
  editing,
  onCancelEdit,
  onSubmitEdit,
  disabled,
  focusToken,
  onTyping,
  initialDraft = '',
  onDraftChange,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const circlePreviewRef = useRef<HTMLVideoElement>(null)
  const voice = useVoiceRecorder()
  const videoCircle = useVideoCircleRecorder(circlePreviewRef)
  /** The active press owns the mode and gestures even if state changes mid-press. */
  const dragRef = useRef<{
    x: number
    y: number
    mode: 'voice' | 'video'
    pressed: boolean
    started: boolean
    cancelled: boolean
    locked: boolean
    holdTimer: ReturnType<typeof setTimeout> | null
  } | null>(null)
  const cancelTargetRef = useRef<HTMLButtonElement>(null)
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleMenuOpenedRef = useRef(false)
  const suppressClickRef = useRef(false)

  // Seeded from the edit target and never synchronised afterwards: the caller
  // remounts this component when the target changes (its `key` carries the
  // envelope id), which is what refills the field without an effect that would
  // fight the user's typing.
  const [value, setValue] = useState(() => editing?.text ?? initialDraft)
  const [busy, setBusy] = useState(false)
  const [recordMode, setRecordMode] = useState<'voice' | 'video'>('voice')
  const [locked, setLocked] = useState(false)
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false)
  const [sendingCircle, setSendingCircle] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleMenuPoint, setScheduleMenuPoint] = useState<{ x: number; y: number } | null>(null)
  const recording = recordMode === 'voice' ? voice.recording : videoCircle.recording
  const recordingSeconds = recordMode === 'voice' ? voice.seconds : videoCircle.seconds
  function updateDraft(text: string): void {
    setValue(text)
    onDraftChange?.(text)
  }

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
  const canSchedule = onSchedule !== undefined && canSend && editing === null

  useEffect(() => () => {
    if (scheduleTimerRef.current !== null) clearTimeout(scheduleTimerRef.current)
  }, [])

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
      updateDraft('')
    } catch (error) {
      // The toast is raised by the caller; keeping the text lets the user retry
      // without retyping it.
      console.error('[chat] the message was not sent', error)
    } finally {
      setBusy(false)
    }
  }

  async function schedule(delaySeconds: number): Promise<void> {
    const text = value.trim()
    if (text.length === 0 || !canSchedule || onSchedule === undefined) return
    setBusy(true)
    try {
      await onSchedule(text, delaySeconds)
      updateDraft('')
      setScheduleDialogOpen(false)
    } catch (error) {
      console.error('[chat] the message was not scheduled', error)
    } finally {
      setBusy(false)
    }
  }

  function startScheduleHold(event: PointerEvent<HTMLButtonElement>): void {
    if (!canSchedule || event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The long press still works without capture; the browser may have
      // already released a pointer during a quick tap.
    }
    scheduleMenuOpenedRef.current = false
    suppressClickRef.current = false
    const x = event.clientX
    const y = event.clientY
    scheduleTimerRef.current = setTimeout(() => {
      scheduleMenuOpenedRef.current = true
      suppressClickRef.current = true
      setScheduleMenuPoint({ x, y })
    }, SCHEDULE_HOLD_MS)
  }

  function endScheduleHold(): void {
    if (scheduleTimerRef.current !== null) {
      clearTimeout(scheduleTimerRef.current)
      scheduleTimerRef.current = null
    }
    if (scheduleMenuOpenedRef.current) suppressClickRef.current = true
  }

  function pick(kind: AttachmentKind): void {
    const input =
      kind === 'photo' ? photoRef.current : kind === 'video' ? videoRef.current : fileRef.current
    input?.click()
  }

  function clearRecordHold(gesture: NonNullable<typeof dragRef.current>): void {
    if (gesture.holdTimer !== null) {
      clearTimeout(gesture.holdTimer)
      gesture.holdTimer = null
    }
  }

  async function beginRecording(mode: 'voice' | 'video', gesture: NonNullable<typeof dragRef.current>): Promise<void> {
    const started = mode === 'voice' ? await voice.start().then(() => true) : await videoCircle.start()
    if (!started || dragRef.current !== gesture || !gesture.pressed || gesture.cancelled) {
      if (mode === 'voice') voice.cancel()
      else videoCircle.cancel()
    }
  }

  async function deliverRecording(mode: 'voice' | 'video'): Promise<void> {
    if (disabled) {
      cancelRecording()
      return
    }
    if (mode === 'video') setSendingCircle(true)
    try {
      const blob = mode === 'voice' ? await voice.finish() : await videoCircle.finish()
      if (blob === null) return
      if (mode === 'voice') {
        onVoiceRecorded(blob, `voice-${Date.now()}.${extensionFor(blob.type)}`)
      } else {
        await onVideoCircleRecorded(blob, `video-circle-${Date.now()}.webm`)
      }
    } catch (cause) {
      console.error(`[${mode === 'voice' ? 'voice' : 'video-note'}] recording could not be sent`, cause)
    } finally {
      setSendingCircle(false)
      setLocked(false)
    }
  }

  function cancelRecording(): void {
    const gesture = dragRef.current
    if (gesture !== null) {
      gesture.cancelled = true
      gesture.pressed = false
      clearRecordHold(gesture)
      dragRef.current = null
    }
    voice.cancel()
    videoCircle.cancel()
    setLocked(false)
  }

  function startRecordingPress(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0 || disabled || busy || sendingCircle || recording) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch (cause) {
      console.warn('[composer] the record button could not capture the pointer', cause)
    }

    suppressClickRef.current = true
    const gesture = {
      x: event.clientX,
      y: event.clientY,
      mode: recordMode,
      pressed: true,
      started: false,
      cancelled: false,
      locked: false,
      holdTimer: null as ReturnType<typeof setTimeout> | null,
    }
    dragRef.current = gesture
    gesture.holdTimer = setTimeout(() => {
      gesture.holdTimer = null
      if (dragRef.current !== gesture || !gesture.pressed || gesture.cancelled) return
      gesture.started = true
      void beginRecording(gesture.mode, gesture)
    }, RECORD_HOLD_MS)
  }

  function trackRecordingDrag(event: PointerEvent<HTMLButtonElement>): void {
    const gesture = dragRef.current
    if (gesture === null || !gesture.started || gesture.cancelled || !gesture.pressed) return

    const target = cancelTargetRef.current?.getBoundingClientRect()
    if (
      target !== undefined &&
      event.clientX >= target.left &&
      event.clientX <= target.right &&
      event.clientY >= target.top &&
      event.clientY <= target.bottom
    ) {
      gesture.cancelled = true
      gesture.pressed = false
      clearRecordHold(gesture)
      dragRef.current = null
      voice.cancel()
      videoCircle.cancel()
      setLocked(false)
      return
    }

    const isRecorderActive = gesture.mode === 'voice' ? voice.recording : videoCircle.recording
    if (!gesture.locked && isRecorderActive && event.clientY - gesture.y <= -LOCK_DRAG_PX) {
      gesture.locked = true
      setLocked(true)
    }
  }

  async function endRecordingPress(): Promise<void> {
    const gesture = dragRef.current
    if (gesture === null) return
    gesture.pressed = false
    clearRecordHold(gesture)

    if (gesture.cancelled) {
      dragRef.current = null
      setLocked(false)
      return
    }
    if (!gesture.started) {
      dragRef.current = null
      setRecordMode((current) => (current === 'voice' ? 'video' : 'voice'))
      return
    }
    if (gesture.locked) {
      dragRef.current = null
      return
    }

    dragRef.current = null
    await deliverRecording(gesture.mode)
  }

  function handleRecordClick(): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!recording && !locked && !disabled && !busy) {
      setRecordMode((current) => (current === 'voice' ? 'video' : 'voice'))
    }
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
    { id: 'camera', label: t('chat.attach.camera'), icon: Camera, onSelect: () => { setCameraDialogOpen(true) } },
  ]

  /**
   * Puts an emoji where the caret is.
   *
   * At the caret, not at the end: the picker is used mid-sentence as often as it
   * starts one, and a field that jumps the caret to the end is the reason people
   * type a message twice. The selection is restored after React has written the
   * new value, which is why it waits for a frame.
   */
  function insertEmoji(emoji: string): void {
    const field = textareaRef.current
    const start = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? value.length
    updateDraft(value.slice(0, start) + emoji + value.slice(end))

    requestAnimationFrame(() => {
      field?.focus()
      const caret = start + emoji.length
      field?.setSelectionRange(caret, caret)
    })
    onTyping()
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
        <span className={cn(
          'overflow-hidden rounded-full bg-black',
          recording && recordMode === 'video'
            ? 'relative size-10 shrink-0'
            : 'pointer-events-none fixed left-[-10000px] size-px opacity-0',
        )}>
          <video ref={circlePreviewRef} autoPlay muted playsInline className="size-full rounded-full object-cover" />
        </span>

        {recording ? (
          <button
            ref={cancelTargetRef}
            type="button"
            aria-label={t('chat.recording.cancel')}
            title={t('chat.recording.cancelHint')}
            onClick={cancelRecording}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-danger transition-colors hover:bg-danger/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : editing === null ? (
          <DropdownMenu
            trigger={<Paperclip className="size-5" aria-hidden />}
            triggerLabel={t('chat.attach.label')}
            items={menuItems}
            align="start"
            side="top"
          />
        ) : null}

        {recording ? (
          <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-danger/50 bg-bg px-2 text-sm text-fg">
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
            <span className="shrink-0 tabular-nums">{formatClipDuration(recordingSeconds)}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">
              {locked ? t('chat.recording.locked') : t('chat.recording.hint')}
            </span>
            {recordMode === 'video' && locked ? (
              <button
                type="button"
                aria-label={t('chat.videoNote.switchCamera')}
                title={t('chat.videoNote.switchCamera')}
                disabled={videoCircle.switchingCamera}
                onClick={() => { void videoCircle.switchCamera() }}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
              >
                {videoCircle.switchingCamera
                  ? <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  : <SwitchCamera className="size-4" aria-hidden />}
              </button>
            ) : null}
            {locked ? (
              <button
                type="button"
                aria-label={t('chat.send')}
                title={t('chat.send')}
                disabled={disabled || sendingCircle}
                onClick={() => { void deliverRecording(recordMode) }}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
              >
                {sendingCircle ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              </button>
            ) : null}
          </div>
        ) : sendingCircle ? (
          <div role="status" className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-accent/40 bg-bg px-3 text-xs text-fg-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            {t('chat.videoNote.sending')}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              updateDraft(event.target.value)
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

        {/* Left of the microphone, and out of the way of the recording strip:
            an emoji has nowhere to go while the field is showing a timer. */}
        {recording || sendingCircle ? null : (
          <EmojiPicker onPick={insertEmoji} disabled={disabled} />
        )}

        {/* The microphone stays mounted for the whole press, which is the hinge
            of the gesture: it holds the pointer capture, and unmounting it the
            moment the recorder starts was what swallowed the release and left
            the recording running with nothing but the bin to stop it. */}
        {value.trim().length > 0 && !recording && !sendingCircle ? (
          <button
            type="button"
            aria-label={editing === null ? t('chat.send') : t('chat.edit.save')}
            title={editing === null ? t('chat.send') : t('chat.edit.save')}
            disabled={!canSend}
            onPointerDown={startScheduleHold}
            onPointerUp={endScheduleHold}
            onPointerCancel={endScheduleHold}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
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
            aria-label={recordMode === 'voice' ? t('chat.voice.record') : t('chat.videoNote.record')}
            title={recording ? t('chat.recording.hint') : t(recordMode === 'voice' ? 'chat.voice.recordHint' : 'chat.videoNote.recordHint')}
            aria-pressed={recording}
            disabled={disabled || sendingCircle}
            onClick={handleRecordClick}
            onPointerDown={(event) => {
              startRecordingPress(event)
            }}
            onPointerMove={trackRecordingDrag}
            onPointerUp={() => {
              void endRecordingPress()
            }}
            onPointerCancel={() => {
              suppressClickRef.current = false
              cancelRecording()
            }}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              'flex size-10 shrink-0 cursor-pointer touch-none items-center justify-center rounded-full transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              recording
                ? 'bg-danger text-danger-fg'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            )}
          >
            {recordMode === 'voice' ? <Mic className="size-5" aria-hidden /> : <Video className="size-5" aria-hidden />}
          </button>
        )}
      </div>

      {recordMode === 'video' && videoCircle.error !== null ? (
        <p role="alert" className="px-3 pb-2 text-xs text-danger">
          {t(`chat.videoNote.error.${videoCircle.error}`)}
        </p>
      ) : null}

      <ContextMenu
        open={scheduleMenuPoint !== null}
        x={scheduleMenuPoint?.x ?? 0}
        y={scheduleMenuPoint?.y ?? 0}
        items={[
          {
            id: 'schedule-send',
            label: t('chat.scheduled.action'),
            icon: CalendarClock,
            disabled: !canSchedule,
            onSelect: () => {
              setScheduleMenuPoint(null)
              setScheduleDialogOpen(true)
            },
          },
        ]}
        onClose={() => setScheduleMenuPoint(null)}
      />

      {onSchedule === undefined ? null : (
        <DurationDialog
          open={scheduleDialogOpen}
          onClose={() => setScheduleDialogOpen(false)}
          title={t('chat.scheduled.title')}
          hint={t('chat.scheduled.hint')}
          confirmLabel={t('chat.scheduled.confirm')}
          minSeconds={60}
          maxSeconds={24 * 60 * 60}
          initialSeconds={60 * 60}
          loading={busy}
          warningForSeconds={scheduleWarningForSeconds}
          onChoose={(seconds) => { void schedule(seconds) }}
        />
      )}

      <CameraCaptureDialog
        open={cameraDialogOpen}
        onClose={() => setCameraDialogOpen(false)}
        onCapture={onPickFile}
      />

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

