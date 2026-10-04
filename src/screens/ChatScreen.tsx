import {
  Eraser,
  MessageSquare,
  Phone,
  Trash2,
  UserRoundMinus,
  UserRoundPlus,
  Video,
  VolumeX,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import { addContact, removeContact } from '../api/contacts'
import { muteConversation, unmuteConversation } from '../api/conversations'
import { AttachmentPreviewDialog } from '../components/chat/AttachmentPreviewDialog'
import { ChatHeader } from '../components/chat/ChatHeader'
import { ChatSearchOverlay } from '../components/chat/ChatSearchOverlay'
import {
  MessageComposer,
  type AttachmentKind,
  type EditingState,
} from '../components/chat/MessageComposer'
import { MessageList, type MessageListHandle } from '../components/chat/MessageList'
import { PinnedBanner } from '../components/chat/PinnedBanner'
import { buildMessageMenuItems, buildReactionOptions } from '../components/chat/messageMenu'
import { presenceText } from '../components/chat/presenceText'
import { MuteDialog, type MuteChoice } from '../components/layout/MuteDialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ContextMenu } from '../components/ui/ContextMenu'
import type { DropdownItem } from '../components/ui/DropdownMenu'
import { EmptyState } from '../components/ui/EmptyState'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useChatSearch } from '../hooks/useChatSearch'
import { useConversation } from '../hooks/useConversation'
import { usePeerInfo } from '../hooks/usePeerInfo'
import { usePins } from '../hooks/usePins'
import { useSenderNames } from '../hooks/useSenderNames'
import { useToast } from '../hooks/useToast'
import { ROUTES } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import {
  applyDelete,
  applyEdit,
  applyReaction,
  togglePin as togglePinned,
} from '../state/messageMutations'
import { clearConversationHistory, deleteConversationLocally } from '../storage/conversations'
import type { MessageRecord } from '../storage/db'
import {
  hideConversation,
  markConversationRead,
  setHistoryCursor,
  setPinnedBannerHidden,
} from '../storage/read_state'
import type { Account } from '../types'

/**
 * The open conversation.
 *
 * Split in two so the route's parameters can be validated before any of the
 * screen's hooks run — a chat id that is not a chat, or no signed-in account,
 * must not leave a half-mounted transcript behind.
 */
export function ChatScreen() {
  const { id } = useParams<{ id: string }>()
  const account = useActiveAccount()

  if (id === undefined) {
    return <Navigate to={ROUTES.app} replace />
  }
  if (account === null) {
    return null
  }
  // Keyed by conversation so every piece of per-chat state — the draft, the open
  // menus, the search — starts fresh instead of leaking between chats.
  return <ChatView key={id} account={account} conversationId={id} />
}

function ChatView({ account, conversationId }: { account: Account; conversationId: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const store = requireAccountStore(account.id)

  const conversationView = useConversation(account, conversationId)
  const { conversation, peerAccountId, contactName, avatarUrl, loading: loadingConversation } = conversationView
  const peer = usePeerInfo(account, peerAccountId)
  const pins = usePins(account, conversationId)

  const messages = useStore(store, (state) => state.messages)
  const loadingMessages = useStore(store, (state) => state.loadingMessages)
  const hasOlder = useStore(store, (state) => state.hasOlder)

  const listRef = useRef<MessageListHandle>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlight, setHighlight] = useState<{ id: string; token: number } | null>(null)
  const [menu, setMenu] = useState<{ message: MessageRecord; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MessageRecord | null>(null)
  const [confirming, setConfirming] = useState<'clear' | 'delete' | null>(null)
  const [muteOpen, setMuteOpen] = useState(false)
  const [attachment, setAttachment] = useState<{ file: File; kind: AttachmentKind } | null>(null)
  const [busy, setBusy] = useState(false)
  const [focusToken, setFocusToken] = useState(0)

  const search = useChatSearch(account, conversationId, searchOpen)

  useEffect(() => {
    void store.getState().actions.openConversation(conversationId)
    // Opening a conversation is what marks it read, including through a link.
    void markConversationRead(account.id, conversationId)
    return () => {
      store.getState().actions.closeConversation(conversationId)
    }
  }, [store, account.id, conversationId])

  useEffect(() => {
    if (highlight === null) {
      return
    }
    const timer = setTimeout(() => {
      setHighlight(null)
    }, 2000)
    return () => {
      clearTimeout(timer)
    }
  }, [highlight])

  const isGroup = conversation?.kind === 'group'
  const senderIds = useMemo(
    () =>
      isGroup
        ? [...new Set(messages.filter((m) => m.senderAccountId !== account.id).map((m) => m.senderAccountId))]
        : [],
    [isGroup, messages, account.id],
  )
  const senderNames = useSenderNames(account, senderIds)

  const title = useMemo(() => {
    if (conversation === null) {
      return loadingConversation ? '' : t('chat.notFound')
    }
    if (conversation.kind === 'saved') {
      return t('chatList.saved')
    }
    if (conversation.kind === 'direct') {
      return contactName ?? peer.profile?.username ?? t('chatList.unknownPeer')
    }
    return conversation.title ?? t('chatList.unknownPeer')
  }, [conversation, contactName, peer.profile, loadingConversation, t])

  const subtitle = useMemo(() => {
    if (conversation === null) {
      return null
    }
    if (conversation.kind === 'saved') {
      return account.fhNumber
    }
    if (conversation.kind === 'direct') {
      return presenceText(peer.presence, i18n.language, t)
    }
    return t('chat.memberCount', { count: conversation.memberCount })
  }, [conversation, peer.presence, i18n.language, t, account.fhNumber])

  const senderNameFor = (message: MessageRecord): string => {
    if (message.senderAccountId === account.id) {
      return t('chat.you')
    }
    // In a one-to-one conversation "somebody else" can only be the peer, and the
    // names are only looked up for groups — where the sender is genuinely unknown.
    if (conversation?.kind === 'direct') {
      return title
    }
    return senderNames.get(message.senderAccountId) ?? t('chatList.unknownPeer')
  }

  function report(cause: unknown, fallbackKey: 'chat.actionFailed'): void {
    const message = cause instanceof Error ? cause.message : String(cause)
    console.error('[chat] an action failed', cause)
    toast.notify({ kind: 'error', message: message.length > 0 ? message : t(fallbackKey) })
  }

  /** Scrolls to a message and outlines it briefly. */
  function jumpTo(envelopeId: string): void {
    const found = listRef.current?.scrollToMessage(envelopeId) ?? false
    if (!found) {
      toast.notify({ kind: 'info', message: t('chat.messageNotLoaded') })
      return
    }
    setHighlight({ id: envelopeId, token: Date.now() })
  }

  async function send(text: string): Promise<void> {
    try {
      await store.getState().actions.sendText(text)
    } catch (cause) {
      report(cause, 'chat.actionFailed')
      // Rethrown so the composer keeps the text the user typed.
      throw cause
    }
  }

  async function submitEdit(text: string): Promise<void> {
    const target = editing
    const message = target === null ? undefined : messages.find((m) => m.envelopeId === target.envelopeId)
    if (target === null || message === undefined) {
      setEditing(null)
      return
    }

    try {
      const editedAt = await applyEdit(account, message, text)
      await store.getState().actions.patchMessage(message.envelopeId, { plaintext: text, editedAt })
      setEditing(null)
    } catch (cause) {
      report(cause, 'chat.actionFailed')
      throw cause
    }
  }

  async function react(message: MessageRecord, emoji: string): Promise<void> {
    try {
      const reactions = await applyReaction(account, message, emoji)
      await store.getState().actions.patchMessage(message.envelopeId, { reactions })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    }
  }

  async function pin(message: MessageRecord): Promise<void> {
    try {
      const isPinned = await togglePinned(account, message)
      if (isPinned) {
        // Pinning is a deliberate act: the banner it feeds must be visible even
        // if it was closed earlier in this conversation.
        await setPinnedBannerHidden(account.id, conversationId, false)
      }
      await store.getState().actions.patchMessage(message.envelopeId, { isPinned })
      toast.notify({
        kind: 'success',
        message: isPinned ? t('chat.pinned.added') : t('chat.pinned.removed'),
      })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    }
  }

  async function copy(message: MessageRecord): Promise<void> {
    if (message.plaintext === null) {
      return
    }
    try {
      await navigator.clipboard.writeText(message.plaintext)
      toast.notify({ kind: 'success', message: t('chat.copied') })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    }
  }

  async function confirmDeleteMessage(): Promise<void> {
    const message = pendingDelete
    if (message === null) {
      return
    }
    setBusy(true)
    try {
      await applyDelete(account, message)
      await store.getState().actions.removeMessage(message.envelopeId)
      setPendingDelete(null)
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    } finally {
      setBusy(false)
    }
  }

  async function chooseMute(choice: MuteChoice): Promise<void> {
    try {
      if (choice.kind === 'unmute') {
        await unmuteConversation(account, conversationId)
      } else {
        await muteConversation(account, conversationId, choice.durationSeconds)
      }
      await store.getState().actions.loadConversations()
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    }
  }

  async function toggleContact(): Promise<void> {
    const profile = peer.profile
    if (peerAccountId === null || profile === null) {
      toast.notify({ kind: 'error', message: t('chat.contact.unavailable') })
      return
    }

    try {
      if (profile.isContact) {
        await removeContact(account, peerAccountId)
      } else {
        await addContact(account, {
          targetFhNumber: profile.fhNumber,
          localUsername: profile.username,
        })
      }
      peer.refreshProfile()
      conversationView.refresh()
      toast.notify({
        kind: 'success',
        message: profile.isContact ? t('chat.contact.removed') : t('chat.contact.added'),
      })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    }
  }

  async function clearHistory(): Promise<void> {
    setBusy(true)
    try {
      const newest = await clearConversationHistory(account.id, conversationId)
      if (newest > 0) {
        // Saved Messages are replayed from the server, so the point the history
        // was cut at has to be remembered or it comes straight back.
        await setHistoryCursor(account.id, conversationId, newest)
      }
      store.getState().actions.dropConversationMessages(conversationId)
      await store.getState().actions.loadConversations()
      setConfirming(null)
      toast.notify({ kind: 'success', message: t('chat.menu.cleared') })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteChat(): Promise<void> {
    setBusy(true)
    try {
      await deleteConversationLocally(account.id, conversationId)
      await hideConversation(account.id, conversationId)
      await store.getState().actions.loadConversations()
      setConfirming(null)
      void navigate(ROUTES.app, { replace: true })
    } catch (cause) {
      report(cause, 'chat.actionFailed')
    } finally {
      setBusy(false)
    }
  }

  function headerMenuItems(): DropdownItem[] {
    const kind = conversation?.kind ?? null
    const withCalls = kind === 'direct' || kind === 'group'
    const muted = conversation?.mutedUntil !== null && conversation?.mutedUntil !== undefined

    return [
      ...(withCalls
        ? [
            {
              id: 'audio-call',
              label: t('chat.call.audio'),
              icon: Phone,
              onSelect: () => {
                toast.notify({ kind: 'info', message: t('chat.call.notYet') })
              },
            },
            {
              id: 'video-call',
              label: t('chat.call.video'),
              icon: Video,
              onSelect: () => {
                toast.notify({ kind: 'info', message: t('chat.call.notYet') })
              },
            },
          ]
        : []),
      ...(kind === 'direct'
        ? [
            {
              id: 'contact',
              label: peer.profile?.isContact === true ? t('chat.contact.remove') : t('chat.contact.add'),
              icon: peer.profile?.isContact === true ? UserRoundMinus : UserRoundPlus,
              disabled: peer.profile === null,
              onSelect: () => {
                void toggleContact()
              },
            },
          ]
        : []),
      {
        id: 'mute',
        label: muted ? t('mute.unmute') : t('chatList.menu.mute'),
        icon: VolumeX,
        onSelect: () => {
          setMuteOpen(true)
        },
      },
      {
        id: 'clear',
        label: t('chat.menu.clearHistory'),
        icon: Eraser,
        onSelect: () => {
          setConfirming('clear')
        },
      },
      {
        id: 'delete',
        label: t('chat.menu.delete'),
        icon: Trash2,
        danger: true,
        onSelect: () => {
          setConfirming('delete')
        },
      },
    ]
  }

  if (!loadingConversation && conversation === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg">
        <EmptyState
          icon={MessageSquare}
          title={t('chat.notFound')}
          description={t('chat.notFoundHint')}
          action={
            <button
              type="button"
              onClick={() => {
                void navigate(ROUTES.app)
              }}
              className="cursor-pointer text-sm font-medium text-accent hover:underline"
            >
              {t('chat.back')}
            </button>
          }
        />
      </div>
    )
  }

  const bannerVisible = !pins.hidden && pins.pins.length > 0 && !searchOpen

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatarUrl={avatarUrl}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        searchOpen={searchOpen}
        onToggleSearch={() => {
          if (searchOpen) {
            // Closing the search hands the caret back to the composer, which is
            // where the user is going next.
            setSearchOpen(false)
            setFocusToken((token) => token + 1)
            return
          }
          setSearchOpen(true)
        }}
        onStartCall={() => {
          toast.notify({ kind: 'info', message: t('chat.call.notYet') })
        }}
        menuItems={headerMenuItems()}
      />

      {bannerVisible ? (
        <PinnedBanner
          pins={pins.pins}
          senderNameFor={senderNameFor}
          index={pins.index}
          onSelect={pins.setIndex}
          onJump={(message) => {
            jumpTo(message.envelopeId)
          }}
          onHide={pins.hide}
        />
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {searchOpen ? (
          <ChatSearchOverlay
            search={search}
            language={i18n.language}
            senderNameFor={senderNameFor}
            onJump={(message) => {
              jumpTo(message.envelopeId)
            }}
            onClose={() => {
              setSearchOpen(false)
              setFocusToken((token) => token + 1)
            }}
          />
        ) : null}

        <MessageList
          ref={listRef}
          messages={messages}
          loading={loadingMessages}
          hasOlder={hasOlder}
          onLoadOlder={() => {
            void store.getState().actions.loadOlderMessages()
          }}
          senderNames={senderNames}
          selfAccountId={account.id}
          language={i18n.language}
          highlightedId={highlight?.id ?? null}
          onMessageMenu={(message, x, y) => {
            setMenu({ message, x, y })
          }}
          onToggleReaction={(message, emoji) => {
            void react(message, emoji)
          }}
        />
      </div>

      {conversation === null ? null : (
        <MessageComposer
          // Remounting on a new edit target is what refills the field; see the
          // component's initial state.
          key={editing?.envelopeId ?? 'new-message'}
          editing={editing}
          onCancelEdit={() => {
            setEditing(null)
          }}
          onSend={send}
          onSubmitEdit={submitEdit}
          onPickFile={(file, kind) => {
            setAttachment({ file, kind })
          }}
          disabled={loadingConversation}
          focusToken={focusToken}
        />
      )}

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={
          menu === null
            ? []
            : buildMessageMenuItems(menu.message, menu.message.senderAccountId === account.id, t, {
                onEdit: () => {
                  setEditing({
                    envelopeId: menu.message.envelopeId,
                    text: menu.message.plaintext ?? '',
                  })
                },
                onTogglePin: () => {
                  void pin(menu.message)
                },
                onCopy: () => {
                  void copy(menu.message)
                },
                onDelete: () => {
                  setPendingDelete(menu.message)
                },
              })
        }
        reactions={
          menu === null
            ? []
            : buildReactionOptions(menu.message, account.id, t, (emoji) => {
                void react(menu.message, emoji)
              })
        }
        onClose={() => {
          setMenu(null)
        }}
      />

      <MuteDialog
        open={muteOpen}
        muted={(conversation?.mutedUntil ?? null) !== null}
        title={title}
        onClose={() => {
          setMuteOpen(false)
        }}
        onChoose={(choice) => {
          void chooseMute(choice)
        }}
      />

      {attachment === null ? null : (
        <AttachmentPreviewDialog
          file={attachment.file}
          kind={attachment.kind}
          onClose={() => {
            setAttachment(null)
          }}
        />
      )}

      <ConfirmDialog
        open={confirming === 'clear'}
        title={t('chat.menu.clearHistory')}
        description={t('chat.menu.clearHistoryHint')}
        confirmLabel={t('chat.menu.clearHistory')}
        danger
        busy={busy}
        onConfirm={() => {
          void clearHistory()
        }}
        onClose={() => {
          setConfirming(null)
        }}
      />

      <ConfirmDialog
        open={confirming === 'delete'}
        title={t('chat.menu.delete')}
        description={t('chat.menu.deleteHint')}
        confirmLabel={t('chat.menu.delete')}
        danger
        busy={busy}
        onConfirm={() => {
          void deleteChat()
        }}
        onClose={() => {
          setConfirming(null)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('chat.menu.deleteMessage')}
        description={t('chat.menu.deleteMessageHint')}
        confirmLabel={t('chat.menu.deleteMessage')}
        danger
        busy={busy}
        onConfirm={() => {
          void confirmDeleteMessage()
        }}
        onClose={() => {
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
