import { ImageUp, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteChannelAvatar,
  deleteGroupAvatar,
  invalidateConversationAvatar,
  uploadChannelAvatar,
  uploadGroupAvatar,
} from '../../api/avatars'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import { requireAccountStore } from '../../state/accountRegistry'
import type { Account } from '../../types'
import { fileToWebp, isImageFile } from '../../utils/image'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { SettingsCard } from '../settings/Section'

export type ConversationPhotoPanelProps = {
  account: Account
  conversationId: string
  kind: 'group' | 'channel'
  title: string
  avatarUrl: string | null
  /** The conversation record was re-read, so the list and header can follow. */
  onChanged: () => void
}

/**
 * The group's or channel's picture.
 *
 * The picked file never leaves the browser as it is: the endpoint accepts WebP
 * only, so it is decoded, scaled and re-encoded here — the same path an account
 * avatar takes, with the same 5 MiB ceiling and the same 512-pixel round.
 */
export function ConversationPhotoPanel({
  account,
  conversationId,
  kind,
  title,
  avatarUrl,
  onChanged,
}: ConversationPhotoPanelProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function replace(file: File): Promise<void> {
    if (!isImageFile(file)) {
      toast.notify({ kind: 'error', message: t('conversation.photo.notAnImage') })
      return
    }

    setBusy(true)
    try {
      const bytes = await fileToWebp(file)
      if (kind === 'group') {
        await uploadGroupAvatar(account, conversationId, bytes)
      } else {
        await uploadChannelAvatar(account, conversationId, bytes)
      }
      await after()
      toast.notify({ kind: 'success', message: t('conversation.photo.updated') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    try {
      if (kind === 'group') {
        await deleteGroupAvatar(account, conversationId)
      } else {
        await deleteChannelAvatar(account, conversationId)
      }
      await after()
      toast.notify({ kind: 'success', message: t('conversation.photo.removed') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Everything a changed picture invalidates.
   *
   * The image URL has to change or the browser keeps showing the cached 404 of a
   * conversation that had no picture, and the conversation list is what tells
   * the rows beside this screen that there is one now.
   */
  async function after(): Promise<void> {
    invalidateConversationAvatar(conversationId)
    await requireAccountStore(account.id).getState().actions.loadConversations()
    onChanged()
  }

  return (
    <SettingsCard title={t('conversation.photo.title')}>
      <div className="flex items-center gap-3">
        <Avatar name={title} src={avatarUrl} size="xl" />

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
            {t('conversation.photo.change')}
          </Button>

          {avatarUrl === null ? null : (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                void remove()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              {t('conversation.photo.remove')}
            </Button>
          )}

          <p className="text-xs text-fg-muted">{t('conversation.photo.hint')}</p>
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
    </SettingsCard>
  )
}
