import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl } from '../../api/avatars'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { Avatar } from '../ui/Avatar'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { ChatList } from './ChatList'
import { HamburgerMenu } from './HamburgerMenu'

/**
 * The account header, the search field and the conversation list.
 *
 * The search query is owned here and handed down: the field sits above the list
 * and filters it in place.
 */
export function AppSidebar() {
  const { t } = useTranslation()
  const account = useActiveAccount()
  const [query, setQuery] = useState('')

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-elevated md:border-r md:border-border">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <HamburgerMenu />

        {account === null ? null : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar name={account.username} src={avatarImageUrl(account.id)} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{account.username}</p>
              <p className="truncate text-xs text-fg-muted">{account.fhNumber}</p>
            </div>
          </div>
        )}
      </header>

      <div className="relative p-3">
        <Search
          className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-fg-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={t('chatList.searchPlaceholder')}
          aria-label={t('chatList.searchPlaceholder')}
          className="h-9 w-full rounded-lg border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {account === null ? null : <ChatList account={account} query={query} />}
      </div>

      {/* Kept here as well as in Settings: the theme must be reachable before
          the settings screen exists, and both write through the same store. */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </footer>
    </div>
  )
}
