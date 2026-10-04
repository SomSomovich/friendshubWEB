import { useTranslation } from 'react-i18next'
import type { HandleCheck } from '../../hooks/useHandleAvailability'
import { MAX_HANDLE_LENGTH } from '../../utils/handle'
import { SettingsCard, SettingsChoice, SettingsRow } from '../settings/Section'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { handleFeedback } from './handleMessage'

/** The server's own limits, shared by groups and channels. */
export const MAX_TITLE = 128
export const MAX_DESCRIPTION = 512

export type InfoValues = {
  title: string
  description: string
  handle: string
  isPublic: boolean
}

export type InfoStepProps = {
  cardTitle: string
  titleLabel: string
  descriptionHint: string
  handleHint: string
  handleCheck: HandleCheck
  values: InfoValues
  onChange: (patch: Partial<InfoValues>) => void
}

/**
 * The first step of both creation flows: what the thing is called and who can
 * find it.
 *
 * Shared because the two forms are the same form — a channel is a group without
 * members, and its first screen differs only in wording.
 */
export function InfoStep({
  cardTitle,
  titleLabel,
  descriptionHint,
  handleHint,
  handleCheck,
  values,
  onChange,
}: InfoStepProps) {
  const { t } = useTranslation()
  const feedback = handleFeedback(handleCheck, t)

  return (
    <SettingsCard title={cardTitle}>
      <SettingsRow label={titleLabel} stacked>
        <Input
          label={titleLabel}
          hideLabel
          value={values.title}
          maxLength={MAX_TITLE}
          autoFocus
          onChange={(event) => {
            onChange({ title: event.target.value })
          }}
        />
      </SettingsRow>

      <SettingsRow label={t('create.description')} description={descriptionHint} stacked>
        <Textarea
          label={t('create.description')}
          hideLabel
          rows={3}
          value={values.description}
          maxLength={MAX_DESCRIPTION}
          onChange={(event) => {
            onChange({ description: event.target.value })
          }}
        />
      </SettingsRow>

      <SettingsRow label={t('create.handle')} description={handleHint} stacked>
        <Input
          label={t('create.handle')}
          hideLabel
          value={values.handle}
          maxLength={MAX_HANDLE_LENGTH}
          placeholder="my_name"
          autoComplete="off"
          error={feedback.error ? feedback.message : null}
          helper={feedback.error ? null : feedback.message}
          onChange={(event) => {
            onChange({ handle: event.target.value })
          }}
        />
      </SettingsRow>

      <SettingsRow label={t('create.visibility')} stacked>
        <SettingsChoice
          label={t('create.visibility')}
          value={values.isPublic ? 'public' : 'private'}
          onChange={(value) => {
            onChange({ isPublic: value === 'public' })
          }}
          options={[
            { value: 'private', label: t('create.private'), description: t('create.privateHint') },
            { value: 'public', label: t('create.public'), description: t('create.publicHint') },
          ]}
        />
      </SettingsRow>
    </SettingsCard>
  )
}
