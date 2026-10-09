import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALL_GROUP_PERMS,
  GROUP_PERMISSION_BITS,
  hasPermission,
  type GroupPermission,
} from '../../api/groups'
import type { ConversationMember } from '../../hooks/useConversationMembers'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export type AdminRightsDialogProps = {
  member: ConversationMember
  /** The name shown in the title, so it is clear whose rights these are. */
  label: string
  /**
   * What the person opening this holds — the owner holds everything.
   *
   * The server refuses to grant a permission its granter does not have, so the
   * bits outside this mask are shown disabled rather than silently dropped when
   * the form is submitted.
   */
  actorPermissions: number
  isOwner: boolean
  busy: boolean
  /** An empty mask demotes the member back to an ordinary one. */
  onSave: (permissions: number) => void
  onClose: () => void
}

/**
 * Which administrative rights a group member holds.
 *
 * Mounted only while it is open — it seeds its checkboxes from the member once,
 * and a mounted-but-hidden dialog would keep the previous member's mask.
 */
export function AdminRightsDialog({
  member,
  label,
  actorPermissions,
  isOwner,
  busy,
  onSave,
  onClose,
}: AdminRightsDialogProps) {
  const { t } = useTranslation()
  /**
   * The bits this form can express.
   *
   * The server refuses a mask containing a bit the granter does not hold —
   * nobody may be promoted above the person doing it — so a bit outside this
   * mask is not merely greyed out: it cannot be sent at all. Seeding the form
   * with one would make Save fail every time.
   */
  const editable = isOwner ? ALL_GROUP_PERMS : actorPermissions
  /** Rights the member holds that this form cannot represent. */
  const above = member.permissions & ~editable

  const [selected, setSelected] = useState<number>(() => member.permissions & editable)

  function toggle(bit: GroupPermission, on: boolean): void {
    setSelected((current) => (on ? current | bit : current & ~bit))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('conversation.rights.title')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              onSave(selected)
            }}
          >
            {t('conversation.rights.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">{label}</p>

        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">{t('conversation.rights.title')}</legend>
          {GROUP_PERMISSION_BITS.map(({ name, bit }) => {
            const allowed = isOwner || hasPermission(actorPermissions, bit)
            return (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-bg-hover has-disabled:cursor-not-allowed has-disabled:opacity-50"
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed"
                  checked={hasPermission(selected, bit)}
                  disabled={!allowed}
                  onChange={(event) => {
                    toggle(bit, event.target.checked)
                  }}
                />
                <span className="text-sm text-fg">{t(`conversation.rights.perm.${name}`)}</span>
              </label>
            )
          })}
        </fieldset>

        {above === 0 ? null : (
          <p className="text-xs text-pretty text-fg-muted">{t('conversation.rights.above')}</p>
        )}
        <p className="text-xs text-pretty text-fg-muted">
          {isOwner ? t('conversation.rights.ownerHint') : t('conversation.rights.limited')}
        </p>
        <p className="text-xs text-pretty text-fg-muted">{t('conversation.rights.demoteHint')}</p>
      </div>
    </Modal>
  )
}
