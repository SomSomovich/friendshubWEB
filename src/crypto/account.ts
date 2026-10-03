import { listOwnDevices, registerDevice, type OwnDevice } from '../api/devices'
import { ApiError } from '../api/errors'
import { getPrekeyStatus, uploadPrekeys } from '../api/prekeys'
import type { Account } from '../types'
import { generateIdentity, generatePrekeys, prekeyCounts } from '../wasm'
import { persistSnapshot, restoreSnapshot } from './snapshot'

/**
 * Device and prekey lifecycle: the steps that turn a logged-in session into a
 * usable Signal device.
 */

/** Per the device model in the brief and WASM_API.txt §4.2. */
const INITIAL_PREKEY_COUNT = 100
/** Below this the device is replenished (WASM_API.txt §4.2). */
const PREKEY_LOW_WATERMARK = 10

/**
 * One-time prekeys per upload request.
 *
 * A prekey carries a Kyber public key, which is ~1.5 KiB serialised as hex, so
 * the documented 100-key payload is about 320 KiB — and anything past roughly
 * 19 KiB drops the connection mid-body on this network often enough to be
 * unusable. The server accumulates across requests and every `generate_prekeys`
 * call allocates fresh ids, so uploading in batches produces exactly the same
 * pool with no risk of re-inserting an id.
 */
const PREKEY_BATCH_SIZE = 4

export type InitializedAccount = {
  deviceNumber: number
  registrationId: number
  identityPubHex: string
  prekeysUploaded: number
}

/** 14-bit registration id (0..16383), as the device model requires. */
function randomRegistrationId(): number {
  const [value] = crypto.getRandomValues(new Uint16Array(1))
  return (value ?? 0) % 16_384
}

/**
 * Registers this tab as a device and gives it a prekey pool.
 *
 * Expects a session created for device number 1 on an account that has no
 * devices yet — the bootstrap case in API_FRONTEND.txt §1, where the session is
 * bound to a device that does not exist until this call creates it. Storage is
 * deliberately not touched: `loadOrInitializeAccount` decides what to persist,
 * and the Node smokes have no IndexedDB at all.
 */
export async function initializeAccount(
  account: Account,
  deviceName: string,
): Promise<InitializedAccount> {
  const registrationId = randomRegistrationId()
  const identity = await generateIdentity(account.id, registrationId)

  const device = await registerDeviceOrRecover(
    account,
    deviceName,
    registrationId,
    identity.publicKeyHex,
  )

  const prekeysUploaded = await uploadPrekeysInBatches(account, device.deviceNumber)

  return {
    deviceNumber: device.deviceNumber,
    registrationId,
    identityPubHex: identity.publicKeyHex,
    prekeysUploaded,
  }
}

/**
 * Registers this device, or adopts the one a lost response already created.
 *
 * Registration is not idempotent: retrying it makes a *second* device, while the
 * session stays bound to the first — after which every prekey upload is rejected
 * with 403, because `X-Device-Number` no longer matches the session. A dropped
 * connection leaves no way to know whether the call landed, so the recovery is to
 * list the account's devices and look for the identity key generated for this
 * attempt, which no other device can carry.
 */
async function registerDeviceOrRecover(
  account: Account,
  deviceName: string,
  registrationId: number,
  identityKeyPub: string,
): Promise<OwnDevice> {
  try {
    return await registerDevice(
      { sessionToken: account.sessionToken },
      { name: deviceName, registrationId, identityKeyPub },
    )
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isTransportFailure) {
      throw error
    }
  }

  const devices = await listOwnDevices({
    sessionToken: account.sessionToken,
    deviceNumber: account.deviceNumber,
  })
  const adopted = devices.find((device) => device.identityKeyPub === identityKeyPub)
  if (adopted === undefined) {
    throw new Error('[crypto] device registration failed and no matching device exists')
  }

  console.warn(
    `[crypto] adopted existing device ${adopted.deviceNumber}: the registration response was lost`,
  )
  return adopted
}

/**
 * Tops the prekey pool up when it runs low, and reports how many keys were sent.
 *
 * The server's count is what matters: other devices consume the pool by fetching
 * bundles, and a drained pool makes this device unreachable to anybody (the
 * server answers `replenish_required`). The module's local count says nothing
 * about that, so it is only used as a fallback when the status call fails.
 */
export async function ensurePrekeysUploaded(account: Account): Promise<number> {
  let available: number
  try {
    available = (await getPrekeyStatus(account)).oneTimeAvailable
  } catch (error) {
    console.warn('[crypto] prekey status unavailable, falling back to the local count', error)
    available = (await prekeyCounts(account.id)).oneTimeAvailable
  }

  if (available >= PREKEY_LOW_WATERMARK) {
    return 0
  }

  return uploadPrekeysInBatches(account, account.deviceNumber)
}

/**
 * The entry point for a logged-in account: restores the module state if this
 * device was used before, initialises it otherwise, and persists the result.
 */
export async function loadOrInitializeAccount(
  account: Account,
  deviceName: string,
): Promise<void> {
  const restored = await restoreSnapshot(account.id)
  if (restored) {
    await ensurePrekeysUploaded(account)
    return
  }

  await initializeAccount(account, deviceName)
  await persistSnapshot(account.id)
}

async function uploadPrekeysInBatches(account: Account, deviceNumber: number): Promise<number> {
  const auth = { sessionToken: account.sessionToken, deviceNumber }
  let uploaded = 0

  while (uploaded < INITIAL_PREKEY_COUNT) {
    const size = Math.min(PREKEY_BATCH_SIZE, INITIAL_PREKEY_COUNT - uploaded)
    const prekeys = await generatePrekeys(account.id, size)
    // Generated before the retry loop, so a retry re-sends the same batch rather
    // than allocating keys that would then be stranded in the module.
    await retryTransport(() => uploadPrekeys(auth, prekeys))
    uploaded += size
  }

  return uploaded
}

/** Uploads the same payload again when the connection drops mid-flight. */
async function retryTransport<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      const dropped = error instanceof ApiError && error.isTransportFailure
      if (!dropped || attempt >= 4) {
        throw error
      }
      console.warn(`[crypto] connection dropped, retrying (${attempt}/3)`)
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
}
