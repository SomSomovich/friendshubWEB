import type { ProfileField } from '../api/profile'

export const MAX_PROFILE_FIELDS = 10
export const PROFILE_LABEL_LIMIT = 64
export const PROFILE_VALUE_LIMIT = 128

export function validProfileFields(fields: ProfileField[]): boolean {
  return fields.length <= MAX_PROFILE_FIELDS && fields.every(({ label, value }) =>
    label.trim().length > 0 && value.trim().length > 0 &&
    [...label].length <= PROFILE_LABEL_LIMIT && [...value].length <= PROFILE_VALUE_LIMIT,
  )
}
