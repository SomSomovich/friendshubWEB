import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl } from '../../api/avatars'
import type { Contact } from '../../api/contacts'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'

export type MemberPickerProps = {
  contacts: Contact[]
  /** True until the contact list has been read. */
  loading: boolean
  selected: string[]
  onToggle: (accountId: string) => void
}

/**
 * Picking the people who start in a group.
 *
 * The candidates are this account's contacts, and only those. The API has no
 * endpoint that turns an FH number or a username into an account — `/handles`
 * resolves groups, channels and bots, and nothing else — so a name that is not
 * already a contact cannot be resolved here at all. The screen says so rather
 * than offering a field that would always come back empty.
 */
export function MemberPicker({ contacts, loading, selected, onToggle }: MemberPickerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const chosen = useMemo(
    () => selected.map((id) => contacts.find((contact) => contact.targetAccountId === id)).filter(isContact),
    [selected, contacts],
  )

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) {
      return contacts
    }
    return contacts.filter((contact) =>
      [contact.username, contact.localUsername ?? '', contact.fhNumber].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    )
  }, [contacts, query])

  return (
    <div className="flex flex-col gap-3">
      {chosen.length === 0 ? null : (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((contact) => (
            <li key={contact.targetAccountId}>
              <button
                type="button"
                onClick={() => {
                  onToggle(contact.targetAccountId)
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-accent bg-accent/15 py-1 pr-2 pl-1 text-xs text-fg hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                <Avatar
                  name={contact.localUsername ?? contact.username}
                  src={avatarImageUrl(contact.targetAccountId)}
                  size="sm"
                  className="size-5 text-[10px]"
                />
                {contact.localUsername ?? contact.username}
                <X className="size-3.5 text-fg-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={t('create.searchPlaceholder')}
          aria-label={t('create.searchPlaceholder')}
          className="h-10 w-full rounded-lg border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      {loading ? (
        // Not the empty message: saying "no contacts yet" before the list has
        // been read would be wrong, and the reader would have no reason to
        // doubt it.
        <div className="flex justify-center py-6">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-pretty text-fg-muted">{t('create.noContacts')}</p>
      ) : matches.length === 0 ? (
        <p className="text-xs text-fg-muted">{t('create.noContactMatches', { query })}</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {matches.map((contact) => {
            const isSelected = selected.includes(contact.targetAccountId)
            return (
              <li key={contact.targetAccountId}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onToggle(contact.targetAccountId)
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                    isSelected ? 'bg-bg-hover' : 'hover:bg-bg-hover',
                  )}
                >
                  <Avatar
                    name={contact.localUsername ?? contact.username}
                    src={avatarImageUrl(contact.targetAccountId)}
                    size="md"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-fg">
                      {contact.localUsername ?? contact.username}
                    </span>
                    <span className="truncate text-xs text-fg-muted">{contact.fhNumber}</span>
                  </span>
                  {isSelected ? <Check className="size-4 shrink-0 text-accent" aria-hidden /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function isContact(value: Contact | undefined): value is Contact {
  return value !== undefined
}
