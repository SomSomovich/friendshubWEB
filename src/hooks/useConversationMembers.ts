import { useCallback, useEffect, useState } from 'react'
import { listChannelMembers } from '../api/channels'
import { listGroupMembers, type GroupRole } from '../api/groups'
import type { Account, ConversationKind } from '../types'

/**
 * Who is in a group or a channel, and what this account may do there.
 *
 * The two endpoints differ in shape — a group member is an account with a role
 * and a permission mask, a channel member is an account *or a bot* with a role
 * and no mask — so both are normalised into one row here. Everything that draws
 * a member list reads that one shape.
 *
 * The caller's own row is what decides which controls the settings screen shows:
 * the server checks every write, and this only mirrors it. A row that cannot be
 * read means no controls, never a guess.
 */

export type MemberActor = 'account' | 'bot'
export type MemberRole = GroupRole | 'subscriber'

export type ConversationMember = {
  actorType: MemberActor
  id: string
  role: MemberRole
  /** Group admins only; the owner holds every bit regardless of this number. */
  permissions: number
  mutedUntil: number | null
  joinedAt: number
}

export type ConversationMembersState = {
  members: ConversationMember[]
  /** This account's own row, or `null` when the list could not be read. */
  self: ConversationMember | null
  /** True until the first read for this conversation settles. */
  loading: boolean
  /** The read failed, so an empty list is not evidence of an empty group. */
  failed: boolean
  /** Re-reads the list, e.g. after a role change. */
  refresh: () => void
}

type Loaded = {
  conversationId: string
  members: ConversationMember[]
  failed: boolean
}

/** Owner first, then admins, then everybody else; ties by when they joined. */
const ROLE_ORDER: Record<MemberRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  subscriber: 3,
}

export function useConversationMembers(
  account: Account,
  conversationId: string,
  kind: ConversationKind | null,
): ConversationMembersState {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [token, setToken] = useState(0)

  const supported = kind === 'group' || kind === 'channel'

  useEffect(() => {
    if (kind !== 'group' && kind !== 'channel') {
      return
    }

    let cancelled = false
    const request =
      kind === 'group'
        ? listGroupMembers(account, conversationId).then((rows): ConversationMember[] =>
            rows.map((row) => ({
              actorType: 'account',
              id: row.accountId,
              role: row.role,
              permissions: row.permissions,
              mutedUntil: row.mutedUntil,
              joinedAt: row.joinedAt,
            })),
          )
        : listChannelMembers(account, conversationId).then((rows): ConversationMember[] =>
            rows.map((row) => ({
              actorType: row.actorType,
              id: row.actorId,
              role: row.role,
              permissions: 0,
              mutedUntil: null,
              joinedAt: row.joinedAt,
            })),
          )

    void request
      .then((members) => {
        if (!cancelled) {
          setLoaded({ conversationId, members: sortMembers(members), failed: false })
        }
      })
      .catch((error: unknown) => {
        // A public group a reader has not joined answers 404 here, and that is
        // not a failure worth a toast: the profile simply shows no members.
        console.warn(`[conversation] the member list of ${conversationId} could not be read`, error)
        if (!cancelled) {
          setLoaded({ conversationId, members: [], failed: true })
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, conversationId, kind, token])

  const refresh = useCallback(() => {
    setToken((value) => value + 1)
  }, [])

  // A list left over from another conversation must not be shown while this one
  // is being read: the settings screen would offer controls over the wrong room.
  const current = loaded !== null && loaded.conversationId === conversationId ? loaded : null
  const members = current?.members ?? []

  return {
    members,
    self: members.find((member) => member.actorType === 'account' && member.id === account.id) ?? null,
    loading: supported && current === null,
    failed: current?.failed ?? false,
    refresh,
  }
}

export function sortMembers(members: ConversationMember[]): ConversationMember[] {
  return [...members].sort((left, right) => {
    const byRole = ROLE_ORDER[left.role] - ROLE_ORDER[right.role]
    return byRole !== 0 ? byRole : left.joinedAt - right.joinedAt
  })
}

/**
 * Whether a member row leads anywhere.
 *
 * A bot has no profile to open, and one's own row would open a *person's*
 * profile modal — the one with "add to contacts" and "block" on it, pointed at
 * the reader. Neither is worth a tap.
 */
export function canOpenMemberProfile(member: ConversationMember, selfAccountId: string): boolean {
  return member.actorType === 'account' && member.id !== selfAccountId
}

/**
 * Whether this account may act as staff here.
 *
 * Deliberately named for what it means to the UI — "show the management entry
 * point" — rather than for a role, because a channel admin's powers are the
 * avatar and nothing else, and the screens decide that per section.
 */
export function isConversationStaff(self: ConversationMember | null): boolean {
  return self !== null && (self.role === 'owner' || self.role === 'admin')
}
