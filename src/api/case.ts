/**
 * The wire format is snake_case; the app (and `src/types`) speaks camelCase.
 *
 * Keys are converted in one place instead of one mapper per endpoint: a mapper
 * that forgets a field fails silently until some screen misrenders, while a
 * single conversion is easy to keep right and easy to test.
 */

const SNAKE_CASE = /_([a-z0-9])/g

export function snakeToCamel(key: string): string {
  return key.replace(SNAKE_CASE, (_match, character: string) => character.toUpperCase())
}

/** Recursively converts every object key to camelCase. */
export function camelizeKeys(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => camelizeKeys(item))
  }
  if (input === null || typeof input !== 'object') {
    return input
  }

  const source = input as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    result[snakeToCamel(key)] = camelizeKeys(value)
  }
  return result
}
