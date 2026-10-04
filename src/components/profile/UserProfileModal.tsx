import {
  Ban,
  MessageSquarePlus,
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
import { addContact, blockAccount, removeContact, unblockAccount } from '../../api/contacts'
import { createDirectConversation } from '../../api/conversations'
import { getAccountProfile, type PublicProfile } from '../../api/profile'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useToast } from '../../hooks/useToast'
import { chatPath } from '../../router/paths'
import { getExistingAccountStore, requireAccountStore } from '../../state/accountRegistry'
import { useUiStore } from '../../state/uiStore'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

/** The profile being shown, tagged with whose it is. */
type Loaded = {
  accountId: string
  profile: PublicProfile | null
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
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)

  const accountId = account?.id ?? null
  // A profile read for one person must never be shown for another: the target
  // is part of the value, not a separate piece of state to keep in step.
  const profile =
    loaded !== null && loaded.accountId === targetAccountId ? loaded.profile : null

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
          fail(error)
          closeProfile()
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

  async function toggleContact(): Promise<void> {
    const current = accountId === null ? undefined : getExistingAccountStore(accountId)?.getState().account
    if (current === undefined || profile === null) {
      return
    }

    setBusy(true)
    try {
      if (profile.isContact) {
        await removeContact(current, profile.id)
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
      onClose={closeProfile}
      title={t('profile.title')}
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
        <div className="flex justify-center py-6">
          <Spinner className="text-fg-muted" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={profile.username}
              src={avatarImageUrl(profile.id)}
              size="xl"
              label={profile.username}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-semibold text-fg">{profile.username}</span>
              <span className="text-sm text-fg-muted">{profile.fhNumber}</span>
              {profile.customStatusText === null && profile.customStatusEmoji === null ? null : (
                <span className="truncate text-sm text-fg-muted">
                  {profile.customStatusEmoji} {profile.customStatusText}
                </span>
              )}
            </div>
          </div>

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
                toast.notify({ kind: 'info', message: t('chat.call.notYet') })
              }}
            >
              <Phone className="size-4" aria-hidden />
              {t('chat.call.audio')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                toast.notify({ kind: 'info', message: t('chat.call.notYet') })
              }}
            >
              <Video className="size-4" aria-hidden />
              {t('chat.call.video')}
            </Button>
          </div>

          {profile.isBlockedByMe ? (
            <p className="rounded-lg border border-border bg-bg p-3 text-xs text-pretty text-fg-muted">
              {t('profile.blockedHint')}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
