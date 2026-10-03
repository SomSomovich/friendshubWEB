import type { GeneratedPrekeys } from '../wasm/types'
import type { AccountAuth } from './auth'
import { get, post } from './client'

export type PrekeyUploadResult = {
  oneTimeInserted: number
  kyberOneTimeInserted: number
}

/** The server's own view of this device's pool. */
export type ServerPrekeyStatus = {
  oneTimeAvailable: number
  kyberOneTimeAvailable: number
  hasSignedPrekey: boolean
  hasKyberLastResort: boolean
}

/**
 * Uploads freshly generated prekeys for the current device.
 *
 * The bridge returns camelCase (it is app-facing) while the endpoint expects the
 * wire names, so the two are mapped here rather than in the crypto layer.
 */
export function uploadPrekeys(
  account: AccountAuth,
  prekeys: GeneratedPrekeys,
): Promise<PrekeyUploadResult> {
  return post<PrekeyUploadResult>('/devices/me/prekeys', toWirePrekeys(prekeys), { account })
}

export function getPrekeyStatus(account: AccountAuth): Promise<ServerPrekeyStatus> {
  return get<ServerPrekeyStatus>('/devices/me/prekeys/status', { account })
}

function toWirePrekeys(prekeys: GeneratedPrekeys): Record<string, unknown> {
  return {
    signed_prekey: prekeys.signedPrekey,
    kyber_last_resort: prekeys.kyberLastResort,
    one_time_prekeys: prekeys.oneTimePrekeys,
    kyber_one_time_prekeys: prekeys.kyberOneTimePrekeys,
  }
}
