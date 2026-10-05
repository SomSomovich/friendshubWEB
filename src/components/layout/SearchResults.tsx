import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { avatarImageUrl, conversationAvatarUrl } from '../../api/avatars'
import { subscribeChannel } from '../../api/channels'
import { joinGroup } from '../../api/groups'
import type { SearchEntityType, SearchResult } from '../../api/search'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { chatPath } from '../../router/paths'
import { requireAccountStore } from '../../state/accountRegistry'
import { useUiStore } from '../../state/uiStore'
import type { Account } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'

export type SearchResultsProps = {
  account: Account
  /** The raw text in the field, `@` and all. */
  query: string
  /** The conversations already on screen above these, so they are not repeated. */
  knownConversationIds: Set<string>
}

/** The order the sections read in: people first, then the places to talk. */
const SECTIONS: ReadonlyArray<{ type: SearchEntityType; labelKey: ParseKeys }> = [
  { type: 'account', labelKey: 'search.sections.accounts' },
  { type: 'group', labelKey: 'search.sections.groups' },
  { type: 'channel', labelKey: 'search.sections.channels' },
  { type: 'bot', labelKey: 'search.sections.bots' },
]

/**
 * What the server knows about a query, under the conversations that already
 * matched it locally.
 *
 * Results the account is already part of are hidden: the row for that
 * conversation is directly above, and a second entry for the same group would be
 * a worse version of the same link.
 */
export function SearchResults({ account, query, knownConversationIds }: SearchResultsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fail = useActionReporter('search')
  const openProfile = useUiStore((state) => state.openProfile)

  const { results, searching, needle } = useGlobalSearch(account, query)

  /** Opens a group or channel, joining it first when this account is not in it. */
  async function openConversation(entityId: string, kind: 'group' | 'channel'): Promise<void> {
    try {
      const store = requireAccountStore(account.id)
      if (!store.getState().conversations.some((entry) => entry.id === entityId)) {
        // Both calls are idempotent, so a stale list that says "not a member"
        // costs a redundant request rather than an error.
        if (kind === 'group') {
          await joinGroup(account, entityId)
        } else {
          await subscribeChannel(account, entityId)
        }
        await store.getState().actions.loadConversations()
      }
      void navigate(chatPath(entityId))
    } catch (error) {
      fail(error)
    }
  }

  function choose(result: SearchResult): void {
    switch (result.entityType) {
      case 'account':
        openProfile(result.entityId)
        return
      case 'group':
        void openConversation(result.entityId, 'group')
        return
      case 'channel':
        void openConversation(result.entityId, 'channel')
        return
      default:
        // Bots are searchable and not chattable from here: this client has no
        // bot module at all, and opening a conversation with one would need an
        // endpoint it has never called.
        toast.notify({ kind: 'info', message: t('search.botUnavailable') })
    }
  }

  if (needle.length === 0) {
    return null
  }
  if (searching) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="size-4 text-fg-muted" />
      </div>
    )
  }

  const shown = results.filter((result) => !knownConversationIds.has(result.entityId))
  if (shown.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-xs text-fg-muted">
        {t('search.nothing', { query: needle })}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {SECTIONS.map((section) => {
        const entries = shown.filter((result) => result.entityType === section.type)
        if (entries.length === 0) {
          return null
        }

        return (
          <section key={section.type} className="flex flex-col gap-1">
            <h3 className="px-2 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
              {t(section.labelKey)}
            </h3>
            <ul>
              {entries.map((result) => (
                <li key={result.entityId}>
                  <ResultRow
                    result={result}
                    onChoose={() => {
                      choose(result)
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ResultRow({ result, onChoose }: { result: SearchResult; onChoose: () => void }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onChoose}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <Avatar name={result.displayName} src={avatarSource(result)} size="md" />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-fg">{result.displayName}</span>
        <span className="truncate text-xs text-fg-muted">
          {result.identifier ?? t('search.noIdentifier')}
        </span>
      </span>

      {result.entityType === 'bot' ? (
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-fg-muted">
          {t('search.sections.bots')}
        </span>
      ) : null}
    </button>
  )
}

/**
 * Where a result's picture lives, or `null` when it has none.
 *
 * The distinction matters: an `<img>` pointed at an account that has no avatar
 * costs a 404 and a flash of nothing, and the search result already says whether
 * a group or channel has one.
 */
function avatarSource(result: SearchResult): string | null {
  if (result.entityType === 'account') {
    return avatarImageUrl(result.entityId)
  }
  if (result.entityType === 'bot' || result.avatarUrl === null) {
    return null
  }
  return conversationAvatarUrl(result.entityId)
}
