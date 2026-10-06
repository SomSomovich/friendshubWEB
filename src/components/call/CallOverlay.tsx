import { useCallStore } from '../../state/callStore'
import { ActiveCallView } from './ActiveCallView'
import { IncomingCallView } from './IncomingCallView'

/**
 * The call surface, mounted once in the app shell.
 *
 * A call is not a route and not a screen's property: it is started from a chat
 * header, an overflow menu or a profile, and it has to appear no matter where
 * the user is when it arrives. So it is one component at the top of the shell,
 * driven entirely by the call store, and it renders nothing at all when there is
 * no call.
 */
export function CallOverlay() {
  const phase = useCallStore((state) => state.phase)

  if (phase === 'idle') {
    return null
  }
  return phase === 'incoming' ? <IncomingCallView /> : <ActiveCallView />
}
