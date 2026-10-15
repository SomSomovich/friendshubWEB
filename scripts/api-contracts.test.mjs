/** Run: node --experimental-vm-modules scripts/api-contracts.test.mjs */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm'
import ts from 'typescript'

async function loadSource(path, respond = () => ({})) {
  const calls = []
  const context = createContext({ console, Date, Number, Set, Map, Error, Promise })
  const cache = new Map()
  async function module(url) {
    if (cache.has(url.href)) return cache.get(url.href)
    if (url.pathname.endsWith('/api/client.ts')) {
      const exports = Object.fromEntries(['get', 'post', 'put', 'patch', 'del'].map((method) => [method,
        async (...args) => { calls.push(JSON.parse(JSON.stringify({ method, args }))); return respond(method, args) },
      ]))
      const stub = new SyntheticModule(Object.keys(exports), function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
      }, { context })
      cache.set(url.href, stub)
      return stub
    }
    const source = await readFile(url, 'utf8')
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
    })
    const mod = new SourceTextModule(outputText, { context, identifier: url.href })
    cache.set(url.href, mod)
    return mod
  }
  const mod = await module(new URL(`../src/${path}.ts`, import.meta.url))
  await mod.link((specifier, parent) => module(new URL(`${specifier}.ts`, parent.identifier)))
  await mod.evaluate()
  return { api: mod.namespace, calls }
}
const account = { id: 'self', sessionToken: 'token', deviceNumber: 3 }

test('profile fields replace the complete set and support clearing all fields', async () => {
  const { api, calls } = await loadSource('api/profile')
  await api.getProfileFields(account)
  await api.setProfileFields(account, [{ label: 'Site', value: 'example.com' }])
  await api.setProfileFields(account, [])
  assert.deepEqual(calls.map(({ method, args }) => [method, args[0]]), [
    ['get', '/profile/fields'], ['put', '/profile/fields'], ['put', '/profile/fields'],
  ])
  assert.deepEqual(calls[2].args[1], { fields: [] })
  assert.deepEqual(calls[1].args[2], { account })
})

test('privacy policy endpoints use their distinct API values', async () => {
  const { api, calls } = await loadSource('api/profile')
  await api.getDmPolicy(account)
  await api.setDmPolicy(account, 'contacts_only')
  await api.getGroupAddPolicy(account)
  await api.setGroupAddPolicy(account, 'nobody')
  assert.deepEqual(calls[1], { method: 'put', args: ['/profile/dm-policy', { policy: 'contacts_only' }, { account }] })
  assert.deepEqual(calls[3], { method: 'put', args: ['/profile/group-add-policy', { policy: 'nobody' }, { account }] })
})

test('group exceptions use account_id in the body and an encoded ID in DELETE', async () => {
  const { api, calls } = await loadSource('api/profile')
  await api.listGroupAddExceptions(account)
  await api.addGroupAddException(account, 'other')
  await api.removeGroupAddException(account, 'id/with space')
  assert.deepEqual(calls[1].args[1], { account_id: 'other' })
  assert.equal(calls[2].args[0], '/profile/group-add-exceptions/id%2Fwith%20space')
  assert.equal(calls[2].method, 'del')
})

test('invisibility is read from the account API', async () => {
  const { api, calls } = await loadSource('api/profile')
  await api.getInvisible(account)
  assert.deepEqual(calls[0], { method: 'get', args: ['/profile/invisible', { account }] })
})

test('profile field limits count Unicode code points and accept the documented boundaries', async () => {
  const { api } = await loadSource('utils/profileFields')
  assert.equal(api.validProfileFields([{ label: '😀'.repeat(64), value: '😀'.repeat(128) }]), true)
  assert.equal(api.validProfileFields([{ label: 'a'.repeat(65), value: 'v' }]), false)
  assert.equal(api.validProfileFields([{ label: 'a', value: 'v'.repeat(129) }]), false)
  assert.equal(api.validProfileFields(Array.from({ length: 10 }, () => ({ label: 'a', value: 'v' }))), true)
  assert.equal(api.validProfileFields(Array.from({ length: 11 }, () => ({ label: 'a', value: 'v' }))), false)
  assert.equal(api.validProfileFields([{ label: ' ', value: 'v' }]), false)
  assert.equal(api.validProfileFields([]), true)
})


test('group changes use PATCH and preserve an explicit false visibility flag', async () => {
  const { api, calls } = await loadSource('api/groups')
  await api.updateGroup(account, 'group/id', { title: 'Updated', description: '', isPublic: false })
  assert.deepEqual(calls[0], { method: 'patch', args: ['/groups/group%2Fid', { title: 'Updated', description: '', is_public: false }, { account }] })
})

test('group member and ownership endpoints encode IDs and send account fields', async () => {
  const { api, calls } = await loadSource('api/groups')
  await api.addGroupMember(account, 'group', 'other')
  await api.removeGroupMember(account, 'group', 'other/id')
  await api.transferGroupOwnership(account, 'group', 'owner')
  await api.deleteGroup(account, 'group')
  assert.deepEqual(calls[0].args[1], { account_id: 'other' })
  assert.equal(calls[1].args[0], '/groups/group/members/other%2Fid')
  assert.deepEqual(calls[2].args[1], { new_owner_account_id: 'owner' })
  assert.equal(calls[3].method, 'del')
})

test('channels expose detail, discovery, owner analytics and ownership actions', async () => {
  const { api, calls } = await loadSource('api/channels')
  await api.getChannel(account, 'channel')
  await api.listPublicChannels(account, 100)
  await api.getChannelByHandle(account, 'a/b')
  await api.getChannelAnalytics(account, 'channel')
  await api.transferChannelOwnership(account, 'channel', 'owner')
  await api.deleteChannel(account, 'channel')
  assert.deepEqual(calls.map(({ args }) => args[0]), ['/channels/channel', '/channels/public', '/channels/by-handle/a%2Fb', '/channels/channel/analytics', '/channels/channel/owner', '/channels/channel'])
  assert.deepEqual(calls[4].args[1], { new_owner_account_id: 'owner' })
})

test('account resolution deduplicates and splits more than 200 IDs without losing results', async () => {
  const { api, calls } = await loadSource('api/accounts', (_method, args) => args[1].account_ids.map((accountId) => ({ accountId })))
  const ids = Array.from({ length: 405 }, (_, index) => `account-${index}`)
  const result = await api.getAccountsBatch(account, [...ids, ids[0]])
  assert.equal(result.length, 405)
  assert.deepEqual(calls.map(({ args }) => args[1].account_ids.length), [200, 200, 5])
  await api.getAccountsBatch(account, [])
  assert.equal(calls.length, 3)
})


test('bot management keeps one-time credentials in dedicated mutation responses', async () => {
  const { api, calls } = await loadSource('api/bots')
  await api.listBots(account)
  await api.createBot(account)
  await api.setBotHandle(account, 'bot/id', 'examplebot')
  await api.rotateBotToken(account, 'bot/id')
  await api.deleteBot(account, 'bot/id')
  assert.deepEqual(calls.map(({ args }) => args[0]), ['/bots', '/bots', '/bots/bot%2Fid/profile', '/bots/bot%2Fid/rotate-token', '/bots/bot%2Fid'])
  assert.deepEqual(calls[2].args[1], { handle: 'examplebot' })
})

test('bot message pages send the documented timestamp cursor', async () => {
  const { api, calls } = await loadSource('api/bots')
  await api.listBotMessages(account, 'bot', { before: 1000, limit: 100 })
  assert.deepEqual(calls[0].args[1].query, { before: 1000, limit: 100 })
})

test('bot handles require their suffix without weakening group and channel validation', async () => {
  const { api } = await loadSource('utils/handle')
  assert.equal(api.validateHandle('examplebot', 'bot'), null)
  assert.equal(api.validateHandle('examplebot'), 'botSuffix')
  assert.equal(api.validateHandle('example', 'bot'), 'requiresBotSuffix')
  assert.equal(api.validateHandle('example'), null)
  assert.equal(api.validateHandle('botfather', 'bot'), 'reserved')
})

test('DESC bot history merges with a live arrival without reversing or duplicating the thread', async () => {
  const { api } = await loadSource('utils/botMessages')
  const result = api.mergeBotMessages([{ id: 'live', createdAt: 30 }, { id: 'b', createdAt: 20 }], [{ id: 'b', createdAt: 20 }, { id: 'a', createdAt: 10 }])
  assert.equal(JSON.stringify(result.map((message) => message.id)), JSON.stringify(['a', 'b', 'live']))
})
