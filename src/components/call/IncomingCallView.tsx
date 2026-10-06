import { Phone } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl } from '../../api/avatars'
import { acceptCall, declineCall } from '../../calls/answer'
import { useCallStore } from '../../state/callStore'
import { Avatar } from '../ui/Avatar'
import { CallButton } from './CallButton'

/**
 * The ringing overlay: who is calling, and the two ways to answer.
 *
 * Focus starts on accept, because that is what a keyboard user reaching an
 * unexpected dialog most often wants, and Escape declines rather than does
 * nothing — an overlay that traps the keyboard with no way out is the one thing
 * a call screen must not be.
 */
export function IncomingCallView() {
  const { t } = useTranslation()
  const peerName = useCallStore((state) => state.peerName)
  const peerAccountId = useCallStore((state) => state.peerAccountId)
  const withVideo = useCallStore((state) => state.withVideo)
  const acceptRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    acceptRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      declineCall()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const name = peerName ?? t('call.unknownPeer')

  return (
    <div
      data-call-overlay
      role="dialog"
      aria-modal="true"
      // The caller's name is on screen; the sentence is what a screen reader
      // gets on arrival, so the dialog announces itself as a call, not a name.
      aria-label={t('call.incoming_from', { name })}
      className="animate-fh-fade fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-bg p-6 text-center text-fg"
    >
      <Avatar
        name={name}
        src={peerAccountId === null ? null : avatarImageUrl(peerAccountId)}
        size="xl"
        className="size-24"
      />

      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold text-pretty">{name}</p>
        <p className="text-sm text-fg-muted">{t(withVideo ? 'call.video' : 'call.audio')}</p>
      </div>

      <div className="flex items-center gap-10">
        <CallButton label={t('call.decline')} tone="danger" onClick={declineCall}>
          <Phone className="size-6 rotate-[135deg]" aria-hidden />
        </CallButton>
        <CallButton
          label={t('call.accept')}
          tone="accept"
          buttonRef={acceptRef}
          onClick={() => {
            void acceptCall()
          }}
        >
          <Phone className="size-6" aria-hidden />
        </CallButton>
      </div>
    </div>
  )
}
