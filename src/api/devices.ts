import type { Account } from '../types'
import type { AccountAuth } from './auth'
import { del, get, post } from './client'

export type OwnDevice = {
  id: string
  deviceNumber: number
  name: string
  registrationId: number
  identityKeyPub: string
  createdAt: number
  lastSeenAt: number | null
}

/** A peer's device: only what is needed to build a prekey bundle. */
export type PeerDevice = {
  deviceNumber: number
  registrationId: number
  identityKeyPub: string
}

export type PrekeyRef = {
  id: number
  pub: string
  sig: string
}

/**
 * `GET /accounts/{id}/devices/{n}/bundle`, kept in wire form.
 *
 * The WASM module parses this object itself when establishing a session, so the
 * keys are deliberately not converted: camelising them would mean converting
 * them straight back before the call.
 */
export type PrekeyBundle = {
  account_id: string
  device_number: number
  registration_id: number
  identity_key_pub: string
  signed_prekey: PrekeyRef
  kyber_last_resort: PrekeyRef
  one_time_prekey: { id: number; pub: string } | null
  kyber_one_time_prekey: { id: number; pub: string } | null
}

export type RegisterDeviceInput = {
  name: string
  registrationId: number
  identityKeyPub: string
}

export function listOwnDevices(account: AccountAuth): Promise<OwnDevice[]> {
  return get<OwnDevice[]>('/devices', { account })
}

/**
 * Registers a device against the current session.
 *
 * Only the token is sent, never `X-Device-Number`: the device does not exist
 * yet, so the session is not bound to one and the server rejects a header that
 * names an unknown device.
 */
export function registerDevice(
  account: Pick<Account, 'sessionToken'>,
  input: RegisterDeviceInput,
): Promise<OwnDevice> {
  return post<OwnDevice>(
    '/devices',
    {
      name: input.name,
      registration_id: input.registrationId,
      identity_key_pub: input.identityKeyPub,
    },
    { token: account.sessionToken },
  )
}

export function revokeDevice(account: AccountAuth, deviceId: string): Promise<void> {
  return del<void>(`/devices/${encodeURIComponent(deviceId)}`, undefined, { account })
}

/** Requires a shared conversation with the peer, otherwise the server answers 404. */
export function listPeerDevices(account: AccountAuth, peerAccountId: string): Promise<PeerDevice[]> {
  return get<PeerDevice[]>(`/accounts/${encodeURIComponent(peerAccountId)}/devices`, { account })
}

/**
 * Consumes one one-time prekey from the peer's pool.
 *
 * Answers 503 `replenish_required` with pool details when the peer has fewer
 * than four keys left; that is the signal to ask them to refill, not a bug.
 */
export function getPeerBundle(
  account: AccountAuth,
  peerAccountId: string,
  deviceNumber: number,
): Promise<PrekeyBundle> {
  return get<PrekeyBundle>(
    `/accounts/${encodeURIComponent(peerAccountId)}/devices/${deviceNumber}/bundle`,
    { account, preserveWireKeys: true },
  )
}
