import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl } from '../../api/avatars'
import type { ConversationMember, MemberRole } from '../../hooks/useConversationMembers'
import { cn } from '../../utils/cn'
import { nowSeconds } from '../../utils/time'
import { Avatar } from '../ui/Avatar'

/**
 * One person — or bot — in a group or channel member list.
 *
 * Shared by the profile's read-only list and the settings screen's manageable
 * one, so a member looks the same in both and a role cannot be spelled one way
 * in one place and another way in the other.
 *
 * Only staff carry a badge. Labelling every row "участник" would be a column of
 * words saying nothing; what a reader wants to see at a glance is who is in
 * charge.
 */

export function RoleBadge({ role }: { role: MemberRole }) {
  const { t } = useTranslation()
  if (role !== 'owner' && role !== 'admin') {
    return null
  }

  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] leading-none',
        role === 'owner' ? 'border-accent text-accent' : 'border-border text-fg-muted',
      )}
    >
      {t(`conversation.role.${role}`)}
    </span>
  )
}

/**
 * A control on a member row.
 *
 * An icon button rather than a dropdown menu: these rows live inside one
 * scrolling column, and the menu component positions its list relative to its
 * trigger, which a row near the bottom of that column would clip. Two icons per
 * row also say what they do without a tap.
 */
export function MemberAction({
  label,
  icon: Icon,
  onClick,
  danger = false,
  disabled = false,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted',
        'transition-colors duration-150 hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
        danger ? 'hover:text-danger' : 'hover:text-fg',
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

export type MemberRowProps = {
  member: ConversationMember
  label: string
  /** True for the row of the account reading the list. */
  isSelf?: boolean
  /** Opens the person's profile; absent for a bot, which has none. */
  onOpen?: () => void
  /** Controls on the right — a role menu, a remove button. */
  trailing?: ReactNode
}

export function MemberRow({ member, label, isSelf = false, onOpen, trailing }: MemberRowProps) {
  const { t } = useTranslation()
  const muted = member.mutedUntil !== null && member.mutedUntil > nowSeconds()

  const identity = (
    <>
      <Avatar
        name={label}
        src={member.actorType === 'account' ? avatarImageUrl(member.id) : null}
        size="sm"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-fg">
          {label}
          {isSelf ? <span className="text-fg-muted"> · {t('chat.you')}</span> : null}
        </span>
        {muted ? (
          <span className="truncate text-xs text-fg-muted">{t('conversation.member.muted')}</span>
        ) : null}
      </span>
    </>
  )

  return (
    <li className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-bg-hover">
      {onOpen === undefined ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">{identity}</div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          {identity}
        </button>
      )}
      <RoleBadge role={member.role} />
      {trailing}
    </li>
  )
}
