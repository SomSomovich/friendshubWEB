import type { TFunction } from 'i18next'
import type { HandleCheck } from '../../hooks/useHandleAvailability'
import type { HandleProblem } from '../../utils/handle'

/**
 * What to say about a handle the user is typing, and whether it counts as an
 * error.
 *
 * Split out because both creation flows show the same field with the same five
 * outcomes, and two copies of this switch would eventually disagree about one of
 * them.
 */
export type HandleFeedback = {
  message: string | null
  error: boolean
}

const PROBLEM_KEYS = {
  tooShort: 'create.handleError.tooShort',
  tooLong: 'create.handleError.tooLong',
  badFirst: 'create.handleError.badFirst',
  badChars: 'create.handleError.badChars',
  reserved: 'create.handleError.reserved',
  botSuffix: 'create.handleError.botSuffix',
} as const satisfies Record<HandleProblem, string>

export function handleFeedback(check: HandleCheck, t: TFunction): HandleFeedback {
  switch (check.state) {
    case 'empty':
      return { message: null, error: false }
    case 'invalid':
      return { message: t(PROBLEM_KEYS[check.problem]), error: true }
    case 'checking':
      return { message: t('create.handleError.checking'), error: false }
    case 'available':
      return { message: t('create.handleError.available'), error: false }
    case 'taken':
      return { message: t('create.handleError.taken'), error: true }
    default:
      return { message: t('create.handleError.unknown'), error: false }
  }
}
