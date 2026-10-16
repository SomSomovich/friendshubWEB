import {
  Ban,
  MessageSquarePlus,
  Pencil,
  Phone,
  ShieldOff,
  UserRoundMinus,
  UserRoundPlus,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { avatarImageUrl } from '../../api/avatars'
import { addContact, blockAccount, listContacts, removeContact, unblockAccount } from '../../api/contacts'
import { createDirectConversation } from '../../api/conversations'
import { getAccountProfile, type PublicProfile } from '../../api/profile'
import { ApiError } from '../../api/errors'
import { startCall } from '../../calls/manager'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useToast } from '../../hooks/useToast'
import { chatPath } from '../../router/paths'
import { getExistingAccountStore, requireAccountStore } from '../../state/accountRegistry'
import { useUiStore } from '../../state/uiStore'
import { Avatar } from '../ui/Avatar'
import { AvatarViewer } from './AvatarViewer'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Skeleton } from '../ui/Skeleton'

/** The profile being shown, tagged with whose it is. */
type Loaded = {
  accountId: string
  profile: PublicProfile | null
}

type LoadedAlias = {
  accountId: string
  targetAccountId: string
  profileUsername: string
  value: string | null
}

/**
 * Somebody else's profile.
 *
 * Mounted once in the app shell and driven by the UI store, because an avatar is
 * a way in from three different places — the chat list, a message and a
 * conversation header — and three copies of this dialog would be three places to
 * keep in step.
 */
export function UserProfileModal() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fail = useActionReporter('profile')

  const account = useActiveAccount()
  const targetAccountId = useUiStore((state) => state.profileAccountId)
  const closeProfile = useUiStore((state) => state.closeProfile)

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [unavailableAccountId, setUnavailableAccountId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [aliasOpen, setAliasOpen] = useState(false)
  const [aliasValue, setAliasValue] = useState('')
  const [loadedAlias, setLoadedAlias] = useState<LoadedAlias | null>(null)

  const accountId = account?.id ?? null
  // A profile read for one person must never be shown for another: the target
  // is part of the value, not a separate piece of state to keep in step.
  const profile =
    loaded !== null && loaded.accountId === targetAccountId ? loaded.profile : null
  const contactAlias =
    loadedAlias?.accountId === accountId &&
    loadedAlias.targetAccountId === targetAccountId &&
    loadedAlias.profileUsername === profile?.username
      ? loadedAlias.value
      : null

  useEffect(() => {
    if (accountId === null || targetAccountId === null || profile?.isContact !== true) return
    const current = getExistingAccountStore(accountId)?.getState().account
    if (current === undefined) return
    let cancelled = false
    void listContacts(current)
      .then((contacts) => {
        if (!cancelled) {
          const alias = contacts.find((contact) => contact.targetAccountId === targetAccountId)?.localUsername ?? null
          setLoadedAlias({
            accountId,
            targetAccountId,
            profileUsername: profile.username,
            value: alias === profile.username ? null : alias,
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) console.warn('[profile] the contact alias could not be loaded', error)
      })
    return () => { cancelled = true }
  }, [accountId, profile?.isContact, profile?.username, targetAccountId])

  useEffect(() => {
    if (accountId === null || targetAccountId === null) {
      return
    }
    // Read from the registry rather than closed over: the account object changes
    // identity on every account edit, and depending on it would re-fetch this
    // profile for an unrelated avatar upload.
    const current = getExistingAccountStore(accountId)?.getState().account
    if (current === undefined) {
      return
    }

    let cancelled = false
    void getAccountProfile(current, targetAccountId)
      .then((fetched) => {
        if (!cancelled) {
          setLoaded({ accountId: targetAccountId, profile: fetched })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 404) {
            setLoaded({ accountId: targetAccountId, profile: null })
            setUnavailableAccountId(targetAccountId)
          } else {
            fail(error)
            closeProfile()
          }
        }
      })

    return () => {
      cancelled = true
    }
  }, [accountId, targetAccountId, revision, fail, closeProfile])

  const refresh = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  async function writeTo(): Promise<void> {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    if (current === undefined || profile === null) {
      return
    }

    setBusy(true)
    try {
      const conversation = await createDirectConversation(current, profile.fhNumber)
      // The conversation list has to learn about a chat that did not exist a
      // moment ago, or opening it would land on "not found".
      await requireAccountStore(current.id).getState().actions.loadConversations()
      closeProfile()
      void navigate(chatPath(conversation.id))
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Calls this person without opening a chat first.
   *
   * No conversation id: a call does not need one, and making the user open the
   * chat first would create a conversation just to place a call neither side
   * may want to keep. The modal closes so the full-screen call is not sitting
   * on top of it.
   */
  function call(withVideo: boolean): void {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    if (current === undefined || profile === null) {
      return
    }
    closeProfile()
    void startCall(current, {
      peerAccountId: profile.id,
      peerName: profile.username,
      conversationId: null,
      withVideo,
    })
  }

  async function toggleContact(): Promise<void> {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    if (current === undefined || profile === null) {
      return
    }

    setBusy(true)
    try {
      if (profile.isContact) {
        await removeContact(current, profile.id)
        setLoadedAlias({
          accountId: current.id,
          targetAccountId: profile.id,
          profileUsername: profile.username,
          value: null,
        })
        toast.notify({ kind: 'success', message: t('chat.contact.removed') })
      } else {
        await addContact(current, {
          targetFhNumber: profile.fhNumber,
          localUsername: profile.username,
        })
        toast.notify({ kind: 'success', message: t('chat.contact.added') })
      }
      refresh()
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  function openAliasEditor(): void {
    if (profile === null) return
    setAliasValue(contactAlias?.trim() || profile.username)
    setAliasOpen(true)
  }

  async function saveAlias(): Promise<void> {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    const alias = aliasValue.trim()
    if (current === undefined || profile === null || alias.length === 0 || alias.length > 64) return
    setBusy(true)
    try {
      const updated = await addContact(current, { targetFhNumber: profile.fhNumber, localUsername: alias })
      setLoadedAlias({
        accountId: current.id,
        targetAccountId: profile.id,
        profileUsername: profile.username,
        value: updated.localUsername === profile.username ? null : updated.localUsername,
      })
      await requireAccountStore(current.id).getState().actions.loadConversations()
      toast.notify({ kind: 'success', message: t('profile.alias.saved') })
      setAliasOpen(false)
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function toggleBlock(): Promise<void> {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    if (current === undefined || profile === null) {
      return
    }

    setBusy(true)
    try {
      if (profile.isBlockedByMe) {
        await unblockAccount(current, profile.id)
        toast.notify({ kind: 'success', message: t('settings.privacy.unblocked') })
      } else {
        await blockAccount(current, profile.id)
        toast.notify({ kind: 'success', message: t('settings.privacy.blockedAdded') })
      }
      refresh()
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={targetAccountId !== null}
      onClose={() => {
        setAliasOpen(false)
        closeProfile()
      }}
      title={t('profile.title')}
      headerAction={profile?.isContact === true ? (
        <button
          type="button"
          onClick={openAliasEditor}
          aria-label={t('profile.alias.edit')}
          title={t('profile.alias.edit')}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
      ) : null}
      footer={
        profile === null ? null : (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void toggleContact()
              }}
            >
              {profile.isContact ? (
                <UserRoundMinus className="size-4" aria-hidden />
              ) : (
                <UserRoundPlus className="size-4" aria-hidden />
              )}
              {profile.isContact ? t('chat.contact.remove') : t('chat.contact.add')}
            </Button>
            <Button
              variant={profile.isBlockedByMe ? 'secondary' : 'danger'}
              disabled={busy}
              onClick={() => {
                void toggleBlock()
              }}
            >
              {profile.isBlockedByMe ? (
                <ShieldOff className="size-4" aria-hidden />
              ) : (
                <Ban className="size-4" aria-hidden />
              )}
              {profile.isBlockedByMe ? t('settings.privacy.unblock') : t('settings.privacy.block')}
            </Button>
          </>
        )
      }
    >
      {profile === null ? (
        unavailableAccountId === targetAccountId ? (
          <p role="status" className="text-sm text-pretty text-fg-muted">{t('profile.unavailable')}</p>
        ) : <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {profile.avatarUrl === null ? <Avatar name={profile.username} size="xl" label={profile.username} /> : (
              <button type="button" aria-label={t('profile.openAvatar', { name: profile.username })} onClick={() => setAvatarOpen(true)} className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <Avatar name={profile.username} src={avatarImageUrl(profile.id)} size="xl" label={profile.username} />
              </button>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-semibold text-fg">{contactAlias?.trim() || profile.username}</span>
              {contactAlias?.trim() ? <span className="truncate text-xs text-fg-muted">{profile.username}</span> : null}
              <span className="text-sm text-fg-muted">{profile.fhNumber}</span>
              {profile.customStatusText === null && profile.customStatusEmoji === null ? null : (
                <span className="truncate text-sm text-fg-muted">
                  {profile.customStatusEmoji} {profile.customStatusText}
                </span>
              )}
            </div>
          </div>

          <AvatarViewer open={avatarOpen} src={profile.avatarUrl === null ? null : avatarImageUrl(profile.id)} label={profile.username} onClose={() => setAvatarOpen(false)} />

          {(profile.profileFields ?? []).length > 0 ? (
            <dl className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
              {profile.profileFields.map((field, index) => (
                <div key={index} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs text-fg-muted break-words">{field.label}</dt>
                  <dd className="text-sm text-fg whitespace-pre-wrap break-words">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              loading={busy}
              onClick={() => {
                void writeTo()
              }}
            >
              <MessageSquarePlus className="size-4" aria-hidden />
              {t('profile.write')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                call(false)
              }}
            >
              <Phone className="size-4" aria-hidden />
              {t('call.audio')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                call(true)
              }}
            >
              <Video className="size-4" aria-hidden />
              {t('call.video')}
            </Button>
          </div>

          {profile.isBlockedByMe ? (
            <p className="rounded-lg border border-border bg-bg p-3 text-xs text-pretty text-fg-muted">
              {t('profile.blockedHint')}
            </p>
          ) : null}
        </div>
      )}
      <Modal
        open={aliasOpen}
        onClose={() => setAliasOpen(false)}
        title={t('profile.alias.title')}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setAliasOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={aliasValue.trim().length === 0} onClick={() => { void saveAlias() }}>{t('settings.save')}</Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          {t('profile.alias.label')}
          <input
            autoFocus
            maxLength={64}
            value={aliasValue}
            onChange={(event) => setAliasValue(event.target.value)}
            className="h-10 rounded-lg border border-border bg-bg px-3 text-sm font-normal text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
      </Modal>
    </Modal>
  )
}
