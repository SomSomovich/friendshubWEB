import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Keeping a transcript anchored, and knowing where the reader is.
 *
 * Split from the list component because none of it is about drawing a message:
 * it is about the scroll container, which changes height for reasons the list
 * never hears about (the composer appearing, a phone rotating, the on-screen
 * keyboard) and which has to survive both "older messages were prepended" and
 * "the conversation was replaced".
 *
 * The anchoring is by hand rather than by a reversed flex container: that trick
 * anchors for free, but it also makes a screen reader read the conversation
 * backwards.
 *
 * The container's ref belongs to the caller and is passed in. Returning it — as
 * a ref object or as a ref callback — would put a ref inside this hook's return
 * value, and the React compiler treats every read of such a value during render
 * as a violation, down to the plain numbers beside it.
 */

/** How close to the bottom still counts as "following the conversation". */
const BOTTOM_THRESHOLD_PX = 80
/** How close to the top starts loading the previous page. */
const TOP_THRESHOLD_PX = 160

export type TranscriptScroll = {
  /** The container's `onScroll`; measures at most once per frame. */
  handleScroll: () => void
  /** True once the reader has scrolled away from the newest message. */
  showJump: boolean
  scrollToBottom: () => void
  /** Ref callback for one message's node, so a jump can find it. */
  registerNode: (envelopeId: string, element: HTMLLIElement | null) => void
  /** @returns false when the message is not part of the loaded window. */
  scrollToMessage: (envelopeId: string) => boolean
}

export type TranscriptScrollInput = {
  /** The oldest and newest rendered messages, which is how a change is noticed. */
  firstId: string | null
  lastId: string | null
  /** Anything that changes when the transcript's content does — the day groups. */
  revision: unknown
  /** True once the transcript itself is on screen; the skeleton is not observed. */
  active: boolean
  /** True while a page (or the conversation) is being read. */
  loading: boolean
  hasOlder: boolean
  onLoadOlder: () => void
}

export function useTranscriptScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  { firstId, lastId, revision, active, loading, hasOlder, onLoadOlder }: TranscriptScrollInput,
): TranscriptScroll {
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const nodesRef = useRef(new Map<string, HTMLLIElement>())
  /** True while the reader is at the bottom, so new messages may pull them along. */
  const followingRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const jumpRef = useRef(false)
  /** The frame a scroll measurement is waiting for, so one gesture costs one. */
  const scrollFrameRef = useRef<number | null>(null)
  const previousRef = useRef<{
    first: string | null
    last: string | null
    height: number
    top: number
  } | null>(null)

  const [showJump, setShowJump] = useState(false)

  /**
   * Keeps the container pinned to the bottom while the reader is following the
   * conversation.
   *
   * Keyed on `active` rather than on mount, because the container does not exist
   * until the transcript does: the list shows a skeleton first, and the observer
   * has to attach to the element that replaces it.
   */
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!active || element === null) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (followingRef.current) {
        element.scrollTop = element.scrollHeight
      }
    })
    observer.observe(element)
    resizeObserverRef.current = observer

    return () => {
      observer.disconnect()
      resizeObserverRef.current = null
    }
  }, [scrollRef, active])

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current)
        scrollFrameRef.current = null
      }
    },
    [],
  )

  const requestOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasOlder) {
      return
    }
    loadingOlderRef.current = true
    onLoadOlder()
  }, [hasOlder, onLoadOlder])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container === null) {
      return
    }
    const previous = previousRef.current

    // Both ends changed: this is a different conversation (or a jump), not an
    // older page or a new message, and the reader belongs at the newest one.
    const switched = previous === null || (previous.first !== firstId && previous.last !== lastId)

    if (switched) {
      container.scrollTop = container.scrollHeight
      followingRef.current = true
      // The ref has to move with the state, or the next scroll would compare
      // against a value that no longer describes what is on screen.
      jumpRef.current = false
      setShowJump(false)
    } else if (previous.first !== firstId) {
      // Older messages were added above: keep the reader on the same message by
      // compensating exactly the height that appeared above the viewport.
      container.scrollTop = previous.top + (container.scrollHeight - previous.height)
    } else if (previous.last !== lastId && followingRef.current) {
      container.scrollTop = container.scrollHeight
    }

    previousRef.current = {
      first: firstId,
      last: lastId,
      height: container.scrollHeight,
      top: container.scrollTop,
    }
  }, [scrollRef, firstId, lastId, revision])

  // A page that does not fill the viewport cannot be scrolled, so the reader
  // would have to guess that more exists. Loading it unprompted is the fix.
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container !== null && container.scrollHeight <= container.clientHeight) {
      requestOlder()
    }
  }, [scrollRef, revision, requestOlder])

  useEffect(() => {
    if (!loading) {
      loadingOlderRef.current = false
    }
  }, [loading])

  const scrollToMessage = useCallback((envelopeId: string): boolean => {
    const node = nodesRef.current.get(envelopeId)
    if (node === undefined) {
      return false
    }
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return true
  }, [])

  const registerNode = useCallback((envelopeId: string, element: HTMLLIElement | null) => {
    if (element === null) {
      nodesRef.current.delete(envelopeId)
      return
    }
    nodesRef.current.set(envelopeId, element)
  }, [])

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current
    if (container !== null) {
      container.scrollTop = container.scrollHeight
    }
  }, [scrollRef])

  /**
   * Reads the scroll position, at most once per frame.
   *
   * A scroll gesture fires far more often than the screen refreshes, and every
   * measurement here forces a layout — so the handler keeps the event cheap and
   * does the reading in a `requestAnimationFrame`, which is also the last moment
   * before the browser would have had to lay out anyway.
   */
  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      return
    }
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null

      const container = scrollRef.current
      if (container === null) {
        return
      }

      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      const following = distanceFromBottom < BOTTOM_THRESHOLD_PX
      followingRef.current = following

      // Guarded so a scroll does not re-render the whole transcript per frame.
      if (jumpRef.current === following) {
        jumpRef.current = !following
        setShowJump(!following)
      }

      if (container.scrollTop < TOP_THRESHOLD_PX) {
        requestOlder()
      }
    })
  }, [scrollRef, requestOlder])

  return { handleScroll, showJump, scrollToBottom, registerNode, scrollToMessage }
}
