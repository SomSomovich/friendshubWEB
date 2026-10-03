/**
 * The module throws `JsValue` (usually a Rust error string, or a `RuntimeError`
 * for a panic). Callers need something typed to branch on, so every failure is
 * converted into `WasmError`.
 */

/**
 * Actionable error kinds. The module reports failures as free-form strings, so
 * these are inferred from their text — see `inferCode`. Anything unrecognised
 * keeps `code === undefined` rather than being forced into a bucket.
 */
export type WasmErrorCode =
  | 'no_identity'
  | 'no_session'
  | 'invalid_argument'
  | 'panic'

export type WasmErrorOptions = {
  /** Bridge function that failed, e.g. `encrypt`. */
  operation: string
  code?: WasmErrorCode
  cause?: unknown
}

export class WasmError extends Error {
  readonly operation: string
  readonly code: WasmErrorCode | undefined

  constructor(message: string, options: WasmErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'WasmError'
    this.operation = options.operation
    this.code = options.code
  }
}

export function toWasmError(error: unknown, operation: string): WasmError {
  if (error instanceof WasmError) {
    return error
  }

  const message = describeThrown(error)
  return new WasmError(`[wasm] ${operation} failed: ${message}`, {
    operation,
    code: inferCode(message),
    cause: error,
  })
}

function describeThrown(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error)
    } catch {
      // Circular or exotic JsValue: fall through to the generic form below.
    }
  }
  return String(error)
}

function inferCode(message: string): WasmErrorCode | undefined {
  if (/^no local identity/.test(message)) {
    return 'no_identity'
  }
  if (/session with .* not found/.test(message)) {
    return 'no_session'
  }
  if (/^invalid argument/.test(message)) {
    return 'invalid_argument'
  }
  // A Rust panic aborts the instance: its in-memory state can no longer be
  // trusted, so this is deliberately distinguishable from a normal error.
  if (/unreachable|panicked at|RuntimeError|time not implemented/.test(message)) {
    return 'panic'
  }
  return undefined
}
