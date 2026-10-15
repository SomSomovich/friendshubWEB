/** Run with: node --experimental-vm-modules --test scripts/auth-session.test.mjs */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm'
import ts from 'typescript'

const FH = 'FH1234567'
const session = (token = 'first') => ({ kind: 'session', sessionToken: token, expiresAt: 9999999999 })
const challenge = (token = 'challenge') => ({ kind: 'totp_required', challengeToken: token, expiresInSeconds: 300 })

class TestApiError extends Error {
  constructor(status) { super('authentication failed'); this.status = status }
  get isTransportFailure() { return this.status === 0 }
}

async function harness(options = {}, shared) {
  const state = shared ?? {
    settings: new Map([[`device_number:${FH}`, '3']]), storage: new Map(),
    snapshot: options.restored ?? false, saved: [], calls: [], revoked: [],
    registrations: 0, uploads: 0, snapshots: 0, deleted: 0,
  }
  const stubs = {
    '../api/errors': { ApiError: TestApiError },
    '../api/client': {
      post: async (path, body) => {
        state.calls.push({ path, body })
        if (path === '/login') return options.login?.(body) ?? challenge()
        if (path === '/login/2fa') return options.totp?.(body) ?? session()
        if (path === '/register') return { fhNumber: FH }
        throw new Error(`unexpected POST ${path}`)
      },
      get: async (path, { account }) => {
        state.calls.push({ path, account })
        if (options.meFailure) throw new Error('me unavailable')
        return { id: 'account-id', userId: 1, fhNumber: FH, username: 'Name', avatarUrl: null, totpEnabled: true }
      },
    },
    '../crypto/account': {
      registerThisDevice: async () => {
        state.registrations++
        if (options.registrationFailure) throw new Error('registration unavailable')
        return { deviceNumber: options.assigned ?? 3, registrationId: 42, identityPubHex: 'abcd', created: true }
      },
      revokeRegisteredDevice: async (account, number) => {
        state.revoked.push({ account, number })
        return options.canRevoke ?? true
      },
      uploadInitialPrekeys: async (account, number) => {
        state.uploads++
        assert.equal(account.deviceNumber, number)
        if (options.uploadFailure) throw new Error('upload unavailable')
      },
    },
    '../crypto/snapshot': {
      persistSnapshot: async () => { state.snapshot = true; state.snapshots++ },
      restoreSnapshot: async () => state.snapshot,
    },
    '../storage/crypto_state': { deleteSnapshot: async () => { state.snapshot = false; state.deleted++ } },
    '../state/accountRegistry': { destroyAccountStore() {}, getAccountStore() {} },
    '../state/pendingVoiceStore': { usePendingVoiceStore: { getState: () => ({ clear() {} }) } },
    '../state/connection': {
      DEVICE_LABEL: 'Web', connectedAccountId: () => null,
      disconnectConnection: async () => {}, ensureConnected: async () => {},
    },
    '../state/uiStore': { useUiStore: { getState: () => ({ setActiveAccount() {} }) } },
    '../storage/accounts': {
      listAccounts: async () => [], purgeAccount: async () => {},
      saveAccount: async (account) => { state.saved.push(account) },
    },
    '../storage/settings': {
      getSetting: async (key) => state.settings.get(key) ?? null,
      setSetting: async (key, value) => { state.settings.set(key, value) },
    },
    '../pwa/push': { unsubscribeFromPush: async () => {} },
    '../wasm': { reset: async () => {} },
  }
  const context = createContext({
    console: { warn() {} }, Date, Number, Error, Promise,
    sessionStorage: {
      getItem: (key) => state.storage.get(key) ?? null,
      setItem: (key, value) => state.storage.set(key, value),
      removeItem: (key) => state.storage.delete(key),
    },
  })
  const modules = new Map()
  async function load(name) {
    if (name === './client') name = '../api/client'
    if (modules.has(name)) return modules.get(name)
    let mod
    if (stubs[name]) {
      const values = stubs[name]
      mod = new SyntheticModule(Object.keys(values), function () {
        for (const [key, value] of Object.entries(values)) this.setExport(key, value)
      }, { context })
    } else {
      const sourcePath = name === '../api/auth' ? '../src/api/auth.ts' : '../src/auth/session.ts'
      const source = await readFile(new URL(sourcePath, import.meta.url), 'utf8')
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
      })
      mod = new SourceTextModule(outputText, { context, identifier: name })
    }
    modules.set(name, mod)
    await mod.link(load)
    return mod
  }
  const mod = await load('session')
  await mod.evaluate()
  return { auth: mod.namespace, state }
}

function posts(state, path) { return state.calls.filter((call) => call.path === path) }

// This test changes the setting deliberately: no phase is allowed to infer the
// binding of an existing challenge/session from mutable browser preferences.
test('device 3 stays bound through password, 2FA and /me despite changed settings', async () => {
  const { auth, state } = await harness({ restored: true })
  await auth.startLogin(FH, 'password')
  state.settings.set(`device_number:${FH}`, '1')
  const accepted = await auth.startLoginWithTotp('challenge', '123456', FH)
  assert.equal(posts(state, '/login/2fa')[0].body.device_number, 3)
  assert.equal(auth.readChallenge(), null)
  state.settings.set(`device_number:${FH}`, '7')
  const account = await auth.persistSession(FH, accepted)
  assert.equal(account.deviceNumber, 3)
  assert.equal(state.calls.find((c) => c.path === '/me').account.deviceNumber, 3)
  assert.equal(state.registrations, 0)
})

test('reload preserves challenge binding without relying on the password in memory', async () => {
  const first = await harness({ restored: true })
  await first.auth.startLogin(FH, 'password')
  first.state.settings.set(`device_number:${FH}`, '1')
  const second = await harness({}, first.state)
  const accepted = await second.auth.startLoginWithTotp('challenge', '123456', FH)
  assert.equal(accepted.deviceNumber, 3)
})

test('concurrent 2FA submissions share a request; a spent challenge cannot be sent again', async () => {
  const { auth, state } = await harness()
  await auth.startLogin(FH, 'password')
  const first = auth.startLoginWithTotp('challenge', '123456', FH)
  const second = auth.startLoginWithTotp('challenge', '123456', FH)
  assert.equal(first, second)
  await first
  await assert.rejects(auth.startLoginWithTotp('challenge', '123456', FH), /no longer active/)
  assert.equal(posts(state, '/login/2fa').length, 1)
})

test('registration for the session number succeeds with one 2FA and no revocation', async () => {
  const { auth, state } = await harness()
  await auth.startLogin(FH, 'password')
  const accepted = await auth.startLoginWithTotp('challenge', '123456', FH)
  const account = await auth.persistSession(FH, accepted)
  assert.equal(account.deviceNumber, 3)
  assert.equal(posts(state, '/login').length, 1)
  assert.equal(posts(state, '/login/2fa').length, 1)
  assert.equal(state.revoked.length, 0)
  assert.equal(state.uploads, 1)
  assert.equal(state.snapshots, 2)
})

test('a different assigned number requests a fresh factor instead of replaying a backup code', async () => {
  const { auth, state } = await harness({ assigned: 4,
    login: (body) => challenge(body.device_number === 4 ? 'new-challenge' : 'challenge'),
    totp: (body) => session(body.device_number === 4 ? 'aligned' : 'first'),
  })
  await auth.startLogin(FH, 'password')
  const first = await auth.startLoginWithTotp('challenge', 'ABCD2345EF', FH)
  const next = await auth.persistSession(FH, first)
  assert.equal(next.kind, 'totp_required')
  assert.equal(posts(state, '/login/2fa').length, 1)
  assert.equal(state.saved.length, 0)
  assert.equal(state.revoked.length, 0)
  assert.equal(auth.readChallenge().deviceNumber, 4)
  const accepted = await auth.startLoginWithTotp('new-challenge', 'GHJK6789MN', FH)
  const account = await auth.persistSession(FH, accepted)
  assert.equal(account.deviceNumber, 4)
  assert.equal(account.sessionToken, 'aligned')
  assert.equal(state.registrations, 1)
  assert.equal(posts(state, '/login/2fa')[1].body.code, 'GHJK6789MN')
})

test('device alignment and crypto identity survive a reload before the fresh factor', async () => {
  const opts = { assigned: 4, login: (body) => challenge(body.device_number === 4 ? 'new-challenge' : 'challenge') }
  const first = await harness(opts)
  await first.auth.startLogin(FH, 'password')
  await first.auth.persistSession(FH, await first.auth.startLoginWithTotp('challenge', '123456', FH))
  const second = await harness(opts, first.state)
  const account = await second.auth.persistSession(FH, await second.auth.startLoginWithTotp('new-challenge', '654321', FH))
  assert.equal(account.deviceNumber, 4)
  assert.equal(second.state.registrations, 1)
  assert.equal(second.state.uploads, 1)
})

test('a failed device registration cannot leave an already accepted challenge available', async () => {
  const { auth, state } = await harness({ registrationFailure: true })
  await auth.startLogin(FH, 'password')
  const accepted = await auth.startLoginWithTotp('challenge', '123456', FH)
  await assert.rejects(auth.persistSession(FH, accepted), /registration unavailable/)
  assert.equal(auth.readChallenge(), null)
  await assert.rejects(auth.startLoginWithTotp('challenge', '123456', FH))
  assert.equal(posts(state, '/login/2fa').length, 1)
})

test('duplicate persistence shares setup and cannot register two devices', async () => {
  const { auth, state } = await harness()
  await auth.startLogin(FH, 'password')
  const accepted = await auth.startLoginWithTotp('challenge', '123456', FH)
  const first = auth.persistSession(FH, accepted)
  assert.equal(first, auth.persistSession(FH, accepted))
  await first
  assert.equal(state.registrations, 1)
  assert.equal(state.saved.length, 1)
})

test('expired and legacy unbound challenges never hit the 2FA endpoint', async () => {
  const { auth, state } = await harness()
  for (const pending of [
    { fhNumber: FH, challengeToken: 'old' },
    { fhNumber: FH, challengeToken: 'old', deviceNumber: 3, expiresAt: Date.now() - 1 },
    { fhNumber: FH, challengeToken: 'old', deviceNumber: 0, expiresAt: Date.now() + 10000 },
  ]) {
    state.storage.set(auth.TOTP_CHALLENGE_KEY, JSON.stringify(pending))
    assert.equal(auth.readChallenge(), null)
    await assert.rejects(auth.startLoginWithTotp('old', '123456', FH))
  }
  assert.equal(posts(state, '/login/2fa').length, 0)
})

test('an invalid code can be corrected on its still active challenge', async () => {
  const { auth, state } = await harness({ totp: (body) => {
    if (body.code === '000000') throw new Error('invalid code')
    return session()
  } })
  await auth.startLogin(FH, 'password')
  await assert.rejects(auth.startLoginWithTotp('challenge', '000000', FH))
  assert.equal(auth.readChallenge().deviceNumber, 3)
  await auth.startLoginWithTotp('challenge', '123456', FH)
  assert.equal(posts(state, '/login/2fa').length, 2)
})

test('cancelling unfinished setup revokes only its new device and clears its snapshot', async () => {
  const { auth, state } = await harness({ assigned: 4 })
  await auth.startLogin(FH, 'password')
  await auth.persistSession(FH, await auth.startLoginWithTotp('challenge', '123456', FH))
  await auth.cancelLogin()
  assert.equal(state.revoked.length, 1)
  assert.equal(state.revoked[0].number, 4)
  assert.equal(state.deleted, 1)
  assert.equal(state.settings.get(`device_number:${FH}`), '3')
})

test('failed revocation preserves the identity and assigned number for recovery', async () => {
  const { auth, state } = await harness({ assigned: 4, canRevoke: false })
  await auth.startLogin(FH, 'password')
  await auth.persistSession(FH, await auth.startLoginWithTotp('challenge', '123456', FH))
  await auth.cancelLogin()
  assert.equal(state.deleted, 0)
  assert.equal(state.snapshot, true)
  assert.equal(state.settings.get(`device_number:${FH}`), '4')
})

test('failed initial prekey upload still saves the generated private keys', async () => {
  const { auth, state } = await harness({ uploadFailure: true })
  await auth.startLogin(FH, 'password')
  await auth.persistSession(FH, await auth.startLoginWithTotp('challenge', '123456', FH))
  assert.equal(state.snapshots, 2)
  assert.equal(state.saved.length, 1)
  assert.equal(state.revoked.length, 0)
})

test('password-only login can align a newly assigned device without 2FA', async () => {
  const { auth, state } = await harness({ assigned: 4, login: (body) => session(`device-${body.device_number}`) })
  const first = await auth.startLogin(FH, 'password')
  const account = await auth.persistSession(FH, first)
  assert.equal(account.deviceNumber, 4)
  assert.equal(account.sessionToken, 'device-4')
  assert.equal(posts(state, '/login/2fa').length, 0)
})

for (const status of [401, 0]) {
  test(`a ${status === 401 ? 'rejected' : 'lost'} 2FA response obtains a fresh challenge without replay`, async () => {
    let count = 0
    const { auth, state } = await harness({
      login: () => challenge(`challenge-${++count}`),
      totp: (body) => {
        if (body.challenge_token === 'challenge-1') throw new TestApiError(status)
        return session()
      },
    })
    await auth.startLogin(FH, 'password')
    await assert.rejects(auth.startLoginWithTotp('challenge-1', '123456', FH))
    assert.equal(auth.readChallenge().challengeToken, 'challenge-2')
    assert.equal(posts(state, '/login/2fa').length, 1)
    await auth.startLoginWithTotp('challenge-2', '654321', FH)
    assert.equal(posts(state, '/login/2fa')[1].body.challenge_token, 'challenge-2')
  })
}

test('a 401 after a reload drops the uncertain challenge and requires password login', async () => {
  const first = await harness()
  await first.auth.startLogin(FH, 'password')
  const second = await harness({ totp: () => { throw new TestApiError(401) } }, first.state)
  await assert.rejects(second.auth.startLoginWithTotp('challenge', '123456', FH))
  assert.equal(second.auth.readChallenge(), null)
  assert.equal(posts(second.state, '/login/2fa').length, 1)
})
