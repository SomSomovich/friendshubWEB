import { WasmError } from './errors'
import type {
  AttachmentKey,
  EncryptResult,
  GeneratedPrekeys,
  IdentityChange,
  PrekeyCounts,
  PrekeyRef,
} from './types'

/**
 * The module returns some results as JSON text, which is untyped at the
 * boundary. Instead of casting it, every field is validated here once: if the
 * module's shape ever changes, the failure happens at the bridge with a precise
 * message rather than as `undefined` deep inside the app.
 */

export function parseJson(raw: string, operation: string): unknown {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed
  } catch (error) {
    throw new WasmError(`[wasm] ${operation}: result is not valid JSON`, {
      operation,
      code: 'invalid_argument',
      cause: error,
    })
  }
}

function fail(operation: string, detail: string): never {
  throw new WasmError(`[wasm] ${operation}: ${detail}`, {
    operation,
    code: 'invalid_argument',
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown, operation: string, what: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(operation, `${what} is not an object`)
  }
  return value
}

function readString(source: Record<string, unknown>, key: string, operation: string): string {
  const value = source[key]
  if (typeof value !== 'string') {
    fail(operation, `field "${key}" is not a string`)
  }
  return value
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  operation: string,
): string | undefined {
  const value = source[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    fail(operation, `field "${key}" is neither a string nor absent`)
  }
  return value
}

function readNumber(source: Record<string, unknown>, key: string, operation: string): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(operation, `field "${key}" is not a finite number`)
  }
  return value
}

function readBoolean(source: Record<string, unknown>, key: string, operation: string): boolean {
  const value = source[key]
  if (typeof value !== 'boolean') {
    fail(operation, `field "${key}" is not a boolean`)
  }
  return value
}

function readArray(value: unknown, operation: string, what: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(operation, `${what} is not an array`)
  }
  return value
}

function mapPrekeyRef(value: unknown, operation: string, what: string): PrekeyRef {
  const record = asRecord(value, operation, what)
  const id = readNumber(record, 'id', operation)
  const pub = readString(record, 'pub', operation)
  const sig = readOptionalString(record, 'sig', operation)
  return sig === undefined ? { id, pub } : { id, pub, sig }
}

function mapPrekeyList(value: unknown, operation: string, what: string): PrekeyRef[] {
  return readArray(value, operation, what).map((entry, index) =>
    mapPrekeyRef(entry, operation, `${what}[${index}]`),
  )
}

export function mapGeneratedPrekeys(parsed: unknown, operation: string): GeneratedPrekeys {
  const record = asRecord(parsed, operation, 'prekeys')
  return {
    signedPrekey: mapPrekeyRef(record['signed_prekey'], operation, 'signed_prekey'),
    kyberLastResort: mapPrekeyRef(record['kyber_last_resort'], operation, 'kyber_last_resort'),
    oneTimePrekeys: mapPrekeyList(record['one_time_prekeys'], operation, 'one_time_prekeys'),
    kyberOneTimePrekeys: mapPrekeyList(
      record['kyber_one_time_prekeys'],
      operation,
      'kyber_one_time_prekeys',
    ),
  }
}

export function mapPrekeyCounts(parsed: unknown, operation: string): PrekeyCounts {
  const record = asRecord(parsed, operation, 'prekey counts')
  return {
    oneTimeAvailable: readNumber(record, 'one_time_available', operation),
    kyberOneTimeAvailable: readNumber(record, 'kyber_one_time_available', operation),
    hasSignedPrekey: readBoolean(record, 'has_signed_prekey', operation),
    hasKyberLastResort: readBoolean(record, 'has_kyber_last_resort', operation),
  }
}

export function mapEncryptResult(parsed: unknown, operation: string): EncryptResult {
  const record = asRecord(parsed, operation, 'encrypt result')
  return {
    ciphertextHex: readString(record, 'ciphertext_hex', operation),
    isPrekeyMessage: readBoolean(record, 'is_prekey_message', operation),
  }
}

export function mapAttachmentKey(parsed: unknown, operation: string): AttachmentKey {
  const record = asRecord(parsed, operation, 'attachment key')
  return {
    keyHex: readString(record, 'key_hex', operation),
    baseNonceHex: readString(record, 'base_nonce_hex', operation),
  }
}

export function mapIdentityChanges(parsed: unknown, operation: string): IdentityChange[] {
  const entries = readArray(parsed, operation, 'identity changes')
  return entries.map((entry, index) => {
    const record = asRecord(entry, operation, `identity change #${index}`)
    return {
      accountId: readString(record, 'account_id', operation),
      deviceNumber: readNumber(record, 'device_number', operation),
      oldKeyHex: readString(record, 'old_key_hex', operation),
      newKeyHex: readString(record, 'new_key_hex', operation),
      changedAt: readNumber(record, 'changed_at', operation),
    }
  })
}
