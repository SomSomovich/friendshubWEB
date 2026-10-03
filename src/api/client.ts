import type { Account } from '../types'
import { asBinaryPayload } from '../utils/bytes'
import { readEnvVar } from '../utils/env'
import { camelizeKeys } from './case'
import { ApiError, toApiError } from './errors'

/**
 * The one place that talks HTTP. Resource modules (`src/api/*.ts`) are thin
 * wrappers over `request`, so auth headers, timeouts, rate-limit handling and
 * key casing are decided here once.
 */

/** Overridable with `VITE_API_BASE` in the browser and in Node alike. */
export const API_BASE_URL = readEnvVar(
  'VITE_API_BASE',
  'https://api-fh.somuch-system.ru/api/v1',
)

/**
 * `/health` is mounted at the root, not under `/api/v1`. A relative
 * `VITE_API_BASE` (the dev proxy) yields a relative URL, which the browser
 * resolves against the page origin.
 */
export const API_HEALTH_URL = `${apiOrigin(API_BASE_URL)}/health`

/** Matches the native client's `transport/http.rs`. */
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRY_AFTER_MS = 30_000
const DEFAULT_RETRY_AFTER_MS = 5_000
const RETRY_AFTER_HEADER = 'retry-after'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestOptions = {
  /** Session token, sent as `Authorization: Bearer <token>`. */
  token?: string
  /** Value for `X-Device-Number`; the server requires it to match the session. */
  deviceNumber?: number
  /**
   * Shorthand for a token plus its device number. `POST /login` for an account
   * with no devices yet has no device number, which is why the two are separate
   * fields rather than one required pair.
   */
  account?: Pick<Account, 'sessionToken' | 'deviceNumber'>
  /** Query parameters; `null` and `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Overrides the base URL, e.g. for root-mounted endpoints like `/health`. */
  baseUrl?: string
  /** Additional headers, e.g. a content type for a raw upload. */
  headers?: Record<string, string>
  /**
   * Raw request body (uploads); mutually exclusive with `body`. Bytes are
   * accepted directly so callers do not have to wrap them in a `Blob`.
   */
  rawBody?: BodyInit | Uint8Array
  /**
   * Skips the snake_case → camelCase conversion of the response. Needed only
   * for payloads handed verbatim to another component: the prekey bundle is
   * parsed by the WASM module, which expects the wire field names.
   */
  preserveWireKeys?: boolean
  /**
   * `bytes` returns the raw body as a `Uint8Array` instead of parsing JSON —
   * used for sealed attachment chunks, which are binary and not JSON at all.
   */
  responseType?: 'json' | 'bytes'
  signal?: AbortSignal
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options)
  const headers = new Headers(options.headers)

  const token = options.token ?? options.account?.sessionToken
  if (token !== undefined) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const deviceNumber = options.deviceNumber ?? options.account?.deviceNumber
  if (deviceNumber !== undefined) {
    headers.set('X-Device-Number', String(deviceNumber))
  }

  let payload = toBodyInit(options.rawBody)
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  let attempt = 0
  for (;;) {
    const response = await send(method, url, headers, payload, options.signal)

    if (response.status === 429 && attempt === 0) {
      const waitMs = retryAfterMs(response)
      console.warn(`[api] rate limited on ${method} ${path}; retrying once in ${waitMs} ms`)
      await delay(waitMs)
      attempt += 1
      continue
    }

    if (!response.ok) {
      throw await toApiError(response)
    }

    return await readBody<T>(response, options)
  }
}

export function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

export function post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('POST', path, body, options)
}

export function put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, body, options)
}

export function patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PATCH', path, body, options)
}

export function del<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, body, options)
}

async function send(
  method: HttpMethod,
  url: string,
  headers: Headers,
  body: BodyInit | undefined,
  externalSignal: AbortSignal | undefined,
): Promise<Response> {
  const timeoutController = new AbortController()
  const timer = setTimeout(() => {
    timeoutController.abort(new Error('request timed out'))
  }, REQUEST_TIMEOUT_MS)

  const signal =
    externalSignal === undefined
      ? timeoutController.signal
      : AbortSignal.any([timeoutController.signal, externalSignal])

  try {
    return await fetch(url, { method, headers, body, signal })
  } catch (error) {
    const timedOut = timeoutController.signal.aborted
    throw new ApiError({
      status: 0,
      code: timedOut ? 'timeout' : 'network',
      message: timedOut
        ? `${method} ${url} timed out after ${REQUEST_TIMEOUT_MS} ms`
        : `${method} ${url} failed: ${describeError(error)}`,
      details: null,
      cause: error,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function readBody<T>(response: Response, options: RequestOptions): Promise<T> {
  if (options.responseType === 'bytes') {
    return new Uint8Array(await response.arrayBuffer()) as T
  }

  const text = await response.text()

  if (text.length === 0) {
    // 204s and empty bodies are the norm for mutations; callers that need a
    // value always hit an endpoint that returns one.
    return undefined as T
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new ApiError({
      status: response.status,
      code: 'invalid_payload',
      message: 'response body is not JSON',
      details: text.slice(0, 500),
      cause: error,
    })
  }

  return (options.preserveWireKeys === true ? parsed : camelizeKeys(parsed)) as T
}

function buildUrl(path: string, options: RequestOptions): string {
  const base = options.baseUrl ?? API_BASE_URL
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  const query = options.query
  if (query === undefined) {
    return url
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue
    }
    params.set(key, String(value))
  }

  const queryString = params.toString()
  return queryString.length === 0 ? url : `${url}?${queryString}`
}

function apiOrigin(base: string): string {
  return /^https?:\/\//i.test(base) ? new URL(base).origin : ''
}

function toBodyInit(body: BodyInit | Uint8Array | undefined): BodyInit | undefined {
  return body instanceof Uint8Array ? asBinaryPayload(body) : body
}

/** `Retry-After` is in seconds; 5 s is the native client's fallback. */
function retryAfterMs(response: Response): number {
  const header = response.headers.get(RETRY_AFTER_HEADER)
  const seconds = header === null ? Number.NaN : Number.parseInt(header, 10)
  const waitMs = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_AFTER_MS
  return Math.min(waitMs, MAX_RETRY_AFTER_MS)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
