import initWasmModule, * as wasm from './pkg/friendshub_wasm.js'
import { WasmError, toWasmError } from './errors'
import { parseJson } from './parse'

/**
 * Shared plumbing for the bridge. Not part of the public surface — the typed
 * wrappers in `index.ts`, `groups.ts` and `attachments.ts` are.
 */

/** Where the module's `.wasm` binary comes from when not passed explicitly. */
export type WasmInitInput = wasm.InitInput

let initialization: Promise<void> | null = null

/**
 * Instantiates the crypto module. Idempotent, and awaited by every wrapper, so
 * no caller can reach the module before it is ready.
 *
 * Browsers call it without arguments: the generated glue fetches the `.wasm`
 * asset that Vite bundled. Node cannot `fetch` a `file://` URL, so the smoke
 * scripts pass the file's bytes instead.
 */
export async function initWasm(input?: WasmInitInput): Promise<void> {
  if (initialization !== null) {
    return initialization
  }

  initialization = (async () => {
    try {
      // The object form avoids the glue's deprecation warning for bare inputs.
      await initWasmModule(input === undefined ? undefined : { module_or_path: input })
    } catch (error) {
      // Stay retryable: a transient asset-fetch failure must not poison the
      // bridge for the rest of the session.
      initialization = null
      throw toWasmError(error, 'init')
    }
  })()

  return initialization
}

/**
 * Runs one synchronous module call, converting anything it throws into a
 * `WasmError`. Every wrapper goes through here so the async signature, the
 * error type and the readiness guarantee hold for the whole bridge.
 */
export async function call<T>(operation: string, invoke: () => T): Promise<T> {
  try {
    await initWasm()
    return invoke()
  } catch (error) {
    throw toWasmError(error, operation)
  }
}

/** Parses a JSON result and validates it in one step. */
export function parseWith<T>(
  operation: string,
  raw: string,
  mapper: (parsed: unknown, operation: string) => T,
): T {
  return mapper(parseJson(raw, operation), operation)
}

/** `registration_id` is a 14-bit value; the server rejects anything wider. */
const MAX_REGISTRATION_ID = 16_383

export function assertRegistrationId(registrationId: number, operation: string): void {
  if (
    !Number.isInteger(registrationId) ||
    registrationId < 0 ||
    registrationId > MAX_REGISTRATION_ID
  ) {
    throw new WasmError(
      `registration_id must be an integer in 0..${MAX_REGISTRATION_ID}, got ${registrationId}`,
      { operation, code: 'invalid_argument' },
    )
  }
}

export function assertPrekeyCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new WasmError(`prekey count must be a positive integer, got ${count}`, {
      operation: 'generate_prekeys',
      code: 'invalid_argument',
    })
  }
}

/** The module models `chunk_index` as `u64`; a `number` can exceed it only
 *  through a bug, so both the integer check and the conversion live here. */
export function toChunkIndex(chunkIndex: number, operation: string): bigint {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) {
    throw new WasmError(
      `chunk_index must be a non-negative safe integer, got ${chunkIndex}`,
      { operation, code: 'invalid_argument' },
    )
  }
  return BigInt(chunkIndex)
}
