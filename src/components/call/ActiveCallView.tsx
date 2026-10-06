import { PhoneOff, RefreshCw, Video, VideoOff, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl } from '../../api/avatars'
import { formatCallDuration } from '../../calls/duration'
import { hangUp, switchCamera, toggleSpeaker, toggleVideo } from '../../calls/manager'
import { applySpeakerOutput } from '../../calls/speaker'
import { useCallStore } from '../../state/callStore'
import { nowSeconds } from '../../utils/time'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { CallButton } from './CallButton'

/**
 * The call screen, for both directions and both kinds.
 *
 * One component rather than four: an outgoing audio call and an answered video
 * call differ in which pieces are visible, not in what they are — and the pieces
 * that decide that are all read from the store.
 *
 * The remote media is deliberately a `<video>` element even for an audio call.
 * It is the element that plays a `MediaStream`'s audio track, and giving an
 * audio call a separate `<audio>` path would mean two places that could fail to
 * attach the stream.
 */
export function ActiveCallView() {
  const { t } = useTranslation()
  const phase = useCallStore((state) => state.phase)
  const peerName = useCallStore((state) => state.peerName)
  const peerAccountId = useCallStore((state) => state.peerAccountId)
  const withVideo = useCallStore((state) => state.withVideo)
  const connectedAt = useCallStore((state) => state.connectedAt)
  const speakerOn = useCallStore((state) => state.speakerOn)
  const cameraOff = useCallStore((state) => state.cameraOff)
  const hasRemoteVideo = useCallStore((state) => state.hasRemoteVideo)
  const error = useCallStore((state) => state.error)
  const localStream = useCallStore((state) => state.localStream)
  const remoteStream = useCallStore((state) => state.remoteStream)

  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const [clock, setClock] = useState(() => nowSeconds())

  useEffect(() => {
    const element = remoteRef.current
    if (element !== null) {
      element.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    const element = localRef.current
    if (element !== null) {
      element.srcObject = localStream
    }
  }, [localStream])

  // Where the speaker toggle actually moves the audio, on platforms that allow
  // it; see `src/calls/speaker.ts`.
  useEffect(() => {
    void applySpeakerOutput(remoteRef.current, speakerOn)
  }, [speakerOn, remoteStream])

  useEffect(() => {
    if (connectedAt === null) {
      return
    }
    const timer = setInterval(() => {
      setClock(nowSeconds())
    }, 1_000)
    return () => {
      clearInterval(timer)
    }
  }, [connectedAt])

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      hangUp()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const name = peerName ?? t('call.unknownPeer')
  const status =
    phase === 'outgoing'
      ? t('call.calling')
      : connectedAt === null
        ? t('call.connecting')
        : formatCallDuration(clock - connectedAt)

  return (
    <div
      data-call-overlay
      role="dialog"
      aria-modal="true"
      aria-label={t('call.inProgress', { name })}
      className="animate-fh-fade fixed inset-0 z-[60] flex flex-col bg-bg text-fg"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className={cn(
            'absolute inset-0 size-full object-cover',
            hasRemoteVideo ? 'opacity-100' : 'opacity-0',
          )}
        />

        {hasRemoteVideo ? (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-black/40 p-3 text-white">
            <span className="truncate text-sm font-medium">{name}</span>
            <span role="timer" aria-label={t('call.duration')} className="text-sm text-white/80">
              {status}
            </span>
          </div>
        ) : (
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Avatar
              name={name}
              src={peerAccountId === null ? null : avatarImageUrl(peerAccountId)}
              size="xl"
              className="size-24"
            />
            <p className="text-xl font-semibold text-pretty">{name}</p>
            <p role="timer" aria-label={t('call.duration')} className="text-sm text-fg-muted">
              {status}
            </p>
          </div>
        )}

        {error === null ? null : (
          // `alert`, not `status`: this is the reason the call is not working,
          // and it is the one thing on the screen a screen reader has to
          // interrupt for.
          <p
            role="alert"
            className="absolute inset-x-4 top-4 z-20 rounded-lg border border-danger bg-bg-elevated p-3 text-sm text-pretty text-danger"
          >
            {error}
          </p>
        )}

        {withVideo && localStream !== null ? (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            aria-label={t('call.yourVideo')}
            className={cn(
              'absolute right-4 bottom-4 z-20 h-[160px] w-[120px] rounded-xl border border-border object-cover shadow-lg',
              cameraOff ? 'opacity-30' : 'opacity-100',
            )}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-4 p-6">
        {withVideo ? (
          <CallButton
            label={t('call.camera_switch')}
            onClick={() => {
              void switchCamera()
            }}
          >
            <RefreshCw className="size-6" aria-hidden />
          </CallButton>
        ) : null}

        <CallButton
          label={t(speakerOn ? 'call.speaker_on' : 'call.speaker_off')}
          tone={speakerOn ? 'active' : 'neutral'}
          pressed={speakerOn}
          onClick={toggleSpeaker}
        >
          <Volume2 className="size-6" aria-hidden />
        </CallButton>

        {withVideo ? (
          <CallButton
            label={t(cameraOff ? 'call.video_on' : 'call.video_off')}
            pressed={!cameraOff}
            onClick={toggleVideo}
          >
            {cameraOff ? (
              <VideoOff className="size-6" aria-hidden />
            ) : (
              <Video className="size-6" aria-hidden />
            )}
          </CallButton>
        ) : null}

        <CallButton label={t('call.end')} tone="danger" caption={t('call.end')} onClick={hangUp}>
          <PhoneOff className="size-6" aria-hidden />
        </CallButton>
      </div>
    </div>
  )
}
