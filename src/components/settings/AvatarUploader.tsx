import { ImageUp, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarImageUrl, deleteAvatar, invalidateAvatar, uploadAvatar } from '../../api/avatars'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { requireAccountStore } from '../../state/accountRegistry'
import { useUiStore } from '../../state/uiStore'
import type { Account } from '../../types'
import { fileToWebp, isImageFile } from '../../utils/image'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

export type AvatarUploaderProps = { account: Account }

/**
 * The account's picture, and the two things that can happen to it.
 *
 * The picked file never leaves the browser in its original form: it is decoded,
 * scaled and re-encoded as WebP here, because that is the only thing the
 * endpoint accepts and because a phone photo is otherwise several megabytes for
 * a 512-pixel circle.
 */
export function AvatarUploader({ account }: AvatarUploaderProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('settings')
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  // Subscribed so a replacement re-renders this preview, not only the sidebar.
  useUiStore((state) => state.accountRevision)

  async function replace(file: File): Promise<void> {
    if (!isImageFile(file)) {
      toast.notify({ kind: 'error', message: t('settings.account.notAnImage') })
      return
    }

    setBusy(true)
    try {
      const bytes = await fileToWebp(file)
      const result = await uploadAvatar(account, bytes)

      invalidateAvatar(account.id)
      await requireAccountStore(account.id)
        .getState()
        .actions.updateAccount({ avatarUrl: result.avatarUrl })
      toast.notify({ kind: 'success', message: t('settings.account.avatarUpdated') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    try {
      await deleteAvatar(account)
      invalidateAvatar(account.id)
      await requireAccountStore(account.id).getState().actions.updateAccount({ avatarUrl: null })
      toast.notify({ kind: 'success', message: t('settings.account.avatarRemoved') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar name={account.username} src={avatarImageUrl(account.id)} size="xl" />

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => {
            inputRef.current?.click()
          }}
        >
          <ImageUp className="size-4" aria-hidden />
          {t('settings.account.changeAvatar')}
        </Button>

        {account.avatarUrl === null ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              void remove()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            {t('settings.account.removeAvatar')}
          </Button>
        )}

        <p className="text-xs text-fg-muted">{t('settings.account.avatarHint')}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so picking the same file twice still fires a change event.
          event.target.value = ''
          if (file !== undefined) {
            void replace(file)
          }
        }}
      />
    </div>
  )
}

