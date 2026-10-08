import { listOwnDevices, registerDevice, revokeDevice, type OwnDevice } from '../api/devices'
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

export type DeviceRegistration = {
  deviceNumber: number
  registrationId: number
  identityPubHex: string
  /**
   * False when the device already existed and was adopted.
   *
   * Only a device this call created may be revoked if the rest of the sign-in
   * fails: the adopted one belongs to a previous attempt that did succeed.
   */
  created: boolean
}

export type InitializedAccount = DeviceRegistration & {
  prekeysUploaded: number
}

/** 14-bit registration id (0..16383), as the device model requires. */
function randomRegistrationId(): number {
  const [value] = crypto.getRandomValues(new Uint16Array(1))
  return (value ?? 0) % 16_384
}

/**
 * Registers this browser as a device, and stops there.
 *
 * Split from the prekey upload because the two can need different sessions. The
 * server gives every registration a *new* number, while the session is bound to
 * the number it was created with — so a session that was allowed to register a
 * device may not be allowed to upload for it, and the caller has to log in again
 * as the device it just became before anything can be stored against it. See
 * `signIn` in `src/auth/session.ts`, which is where that second login happens.
 *
 * Storage is deliberately not touched: the caller decides what to persist, and
 * the Node smokes have no IndexedDB at all.
 */
export async function registerThisDevice(
  account: Account,
  deviceName: string,
): Promise<DeviceRegistration> {
  const registrationId = randomRegistrationId()
  const identity = await generateIdentity(account.id, registrationId)

  const { device, created } = await registerDeviceOrRecover(
    account,
    deviceName,
    registrationId,
    identity.publicKeyHex,
  )

  return {
    deviceNumber: device.deviceNumber,
    registrationId,
    identityPubHex: identity.publicKeyHex,
    created,
  }
}

/** Uploads a first prekey pool for a device that is already registered. */
export function uploadInitialPrekeys(account: Account, deviceNumber: number): Promise<number> {
  return uploadPrekeysInBatches(account, deviceNumber)
}

/**
 * Registers this tab as a device and gives it a prekey pool, in one step.
 *
 * The bootstrap path, and what the smoke scripts use: a session created for
 * device number 1 on an account that has no devices yet, where the number the
 * server assigns is the one the session already names.
 */
export async function initializeAccount(
  account: Account,
  deviceName: string,
): Promise<InitializedAccount> {
  const device = await registerThisDevice(account, deviceName)
  const prekeysUploaded = await uploadPrekeysInBatches(account, device.deviceNumber)
  return { ...device, prekeysUploaded }
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
): Promise<{ device: OwnDevice; created: boolean }> {
  try {
    const device = await registerDevice(
      { sessionToken: account.sessionToken },
      { name: deviceName, registrationId, identityKeyPub },
    )
    return { device, created: true }
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
  return { device: adopted, created: false }
}

/**
 * Removes a device this browser registered and then could not adopt.
 *
 * It must never be left behind. A device with no prekeys is not merely useless:
 * everyone who writes to this account fans out to every one of its devices, the
 * server answers `replenish_required` for that one, and so the account reads as
 * unreachable to all of them — while its own chat history says the conversation
 * is fine. A failed sign-in that leaves one behind poisons the account for
 * everybody until somebody revokes it by hand.
 *
 * Best effort: the caller is already failing, and a cleanup that cannot run must
 * not replace the reason why.
 */
export async function revokeRegisteredDevice(
  account: Account,
  deviceNumber: number,
): Promise<void> {
  try {
    const devices = await listOwnDevices({
      sessionToken: account.sessionToken,
      deviceNumber: account.deviceNumber,
    })
    const device = devices.find((entry) => entry.deviceNumber === deviceNumber)
    if (device === undefined) {
      return
    }
    await revokeDevice(
      { sessionToken: account.sessionToken, deviceNumber: account.deviceNumber },
      device.id,
    )
    console.warn(`[crypto] device ${deviceNumber} was registered and then revoked: unused`)
  } catch (error) {
    console.warn(`[crypto] device ${deviceNumber} could not be removed after a failed sign-in`, error)
  }
}

/**
 * The account whose pool is being topped up, or `null` when nothing is.
 *
 * A flapping connection fires `connected` again and again, and two runs at once
 * would both see a low pool and both upload a full batch — which the server caps
 * at 200 unconsumed keys per kind, so the second would be rejected outright.
 */
let replenishing: { accountId: string; work: Promise<number> } | null = null

/**
 * Tops the prekey pool up when it runs low, and reports how many keys were sent.
 *
 * The server's count is what matters: other devices consume the pool by fetching
 * bundles, and a drained pool makes this device unreachable to anybody (the
 * server answers `replenish_required`). The module's local count says nothing
 * about that, so it is only used as a fallback when the status call fails.
 *
 * Serialised rather than merely guarded: a second caller during a top-up gets
 * the first one's result instead of starting an overlapping one.
 */
export function ensurePrekeysUploaded(account: Account): Promise<number> {
  if (replenishing !== null && replenishing.accountId === account.id) {
    return replenishing.work
  }

  const work = checkAndReplenish(account).finally(() => {
    if (replenishing !== null && replenishing.work === work) {
      replenishing = null
    }
  })
  replenishing = { accountId: account.id, work }
  return work
}

async function checkAndReplenish(account: Account): Promise<number> {
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
 *
 * Returns the device number the module now is. It is the account's own number
 * when the state was restored, and whatever the server assigned when it was not
 * — which the caller has to reconcile with the session, because those two can
 * disagree. See `signIn` in `src/auth/session.ts`.
 */
export async function loadOrInitializeAccount(
  account: Account,
  deviceName: string,
): Promise<number> {
  const restored = await restoreSnapshot(account.id)
  if (restored) {
    await ensurePrekeysUploaded(account)
    return account.deviceNumber
  }

  const device = await registerThisDevice(account, deviceName)
  try {
    await uploadPrekeysInBatches(account, device.deviceNumber)
  } catch (error) {
    if (device.created) {
      await revokeRegisteredDevice(account, device.deviceNumber)
    }
    throw error
  }

  await persistSnapshot(account.id)
  return device.deviceNumber
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
