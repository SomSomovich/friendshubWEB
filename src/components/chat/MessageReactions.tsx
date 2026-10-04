import { cn } from '../../utils/cn'
import type { ReactionCount } from '../../utils/reactions'

export type MessageReactionsProps = {
  reactions: ReactionCount[]
  /** Accessible name for a chip; the emoji alone says nothing to a screen reader. */
  labelFor: (reaction: ReactionCount) => string
  onToggle: (emoji: string) => void
}

/**
 * The chips under a bubble.
 *
 * Clicking one toggles this account's own reaction, which is the same thing the
 * context menu's strip does — the chips are a shortcut, not a separate feature.
 */
export function MessageReactions({ reactions, labelFor, onToggle }: MessageReactionsProps) {
  if (reactions.length === 0) {
    return null
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-label={labelFor(reaction)}
          aria-pressed={reaction.mine}
          onClick={() => {
            onToggle(reaction.emoji)
          }}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
            reaction.mine
              ? 'border-accent bg-accent/15 text-fg'
              : 'border-border bg-bg-elevated text-fg-muted hover:bg-bg-hover hover:text-fg',
          )}
        >
          <span aria-hidden>{reaction.emoji}</span>
          <span className="tabular-nums">{reaction.count}</span>
        </button>
      ))}
    </div>
  )
}
