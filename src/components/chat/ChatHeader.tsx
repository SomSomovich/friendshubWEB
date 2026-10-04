import { ArrowLeft, MoreVertical, Phone, Search, Video } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { DropdownMenu, type DropdownItem } from '../ui/DropdownMenu'

export type ChatHeaderProps = {
  title: string
  subtitle: string | null
  avatarUrl: string | null
  /** Opens the peer's profile. Absent for a conversation that has no peer. */
  onOpenProfile?: () => void
  onBack: () => void
  searchOpen: boolean
  onToggleSearch: () => void
  onStartCall: (withVideo: boolean) => void
  menuItems: DropdownItem[]
}

/**
 * The conversation's own header.
 *
 * Not `ScreenHeader`: this one's identity block is the way into a profile, and
 * the four controls beside it are specific to a conversation. The back button
 * appears only below `md`, where the chat list is not on screen next to it.
 */
export function ChatHeader({
  title,
  subtitle,
  avatarUrl,
  onOpenProfile,
  onBack,
  searchOpen,
  onToggleSearch,
  onStartCall,
  menuItems,
}: ChatHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-1 border-b border-border p-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('chat.back')}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onOpenProfile}
        disabled={onOpenProfile === undefined}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left',
          onOpenProfile === undefined
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        )}
      >
        <Avatar name={title} src={avatarUrl} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{title}</span>
          {subtitle === null ? null : (
            <span className="block truncate text-xs text-fg-muted">{subtitle}</span>
          )}
        </span>
      </button>

      <IconButton
        label={t('chat.search.title')}
        pressed={searchOpen}
        onClick={onToggleSearch}
        icon={<Search className="size-5" aria-hidden />}
      />
      <IconButton
        label={t('chat.call.video')}
        onClick={() => {
          onStartCall(true)
        }}
        icon={<Video className="size-5" aria-hidden />}
      />
      <IconButton
        label={t('chat.call.audio')}
        onClick={() => {
          onStartCall(false)
        }}
        icon={<Phone className="size-5" aria-hidden />}
      />

      <DropdownMenu
        trigger={<MoreVertical className="size-5" aria-hidden />}
        triggerLabel={t('chat.more')}
        items={menuItems}
      />
    </header>
  )
}

function IconButton({
  label,
  icon,
  onClick,
  pressed,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        pressed === true
          ? 'bg-accent/20 text-accent'
          : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
      )}
    >
      {icon}
    </button>
  )
}
