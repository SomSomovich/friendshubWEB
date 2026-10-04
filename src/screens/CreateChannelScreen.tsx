import { Megaphone } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import { createChannel, setChannelHandle, setLinkedGroup } from '../api/channels'
import { createGroup, setGroupHandle } from '../api/groups'
import { CreateSummary } from '../components/create/CreateSummary'
import { CreateWizard } from '../components/create/CreateWizard'
import { InfoStep, type InfoValues } from '../components/create/InfoStep'
import { SettingsCard, SettingsChoice, SettingsRow } from '../components/settings/Section'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { useActionReporter } from '../hooks/useActionReporter'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useHandleAvailability } from '../hooks/useHandleAvailability'
import { useToast } from '../hooks/useToast'
import { ROUTES, chatPath } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import type { Account } from '../types'
import { MAX_HANDLE_LENGTH, normalizeHandle } from '../utils/handle'

const STEPS = ['create.steps.info', 'create.steps.discussion', 'create.steps.confirm'] as const
const LAST_STEP = STEPS.length - 1
/** The server's title limit for a group, shared with the discussion sub-form. */
const MAX_TITLE = 128

/** Where a new channel's comments go. */
type Discussion =
  | { kind: 'none' }
  | { kind: 'new'; title: string; handle: string }
  | { kind: 'existing'; conversationId: string }

/**
 * Creating a channel, and optionally the group its readers comment in.
 *
 * Split in two so the wizard's hooks run with an account that is known to exist,
 * rather than threading a nullable one through every one of them.
 */
export function CreateChannelScreen() {
  const account = useActiveAccount()
  if (account === null) {
    return null
  }
  return <ChannelWizard key={account.id} account={account} />
}

function ChannelWizard({ account }: { account: Account }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fail = useActionReporter('channels')

  const store = requireAccountStore(account.id)
  const conversations = useStore(store, (state) => state.conversations)
  const groups = conversations.filter((entry) => entry.kind === 'group')

  const [step, setStep] = useState(0)
  const [info, setInfo] = useState<InfoValues>({
    title: '',
    description: '',
    handle: '',
    isPublic: false,
  })
  const [discussion, setDiscussion] = useState<Discussion>({ kind: 'none' })
  const [busy, setBusy] = useState(false)

  const channelHandleCheck = useHandleAvailability(account, info.handle, info.handle.trim().length > 0)
  const groupHandleCheck = useHandleAvailability(
    account,
    discussion.kind === 'new' ? discussion.handle : '',
    discussion.kind === 'new' && discussion.handle.trim().length > 0,
  )

  useEffect(() => {
    // The linked-group picker lists the account's groups, which only the
    // conversation list knows about.
    void store.getState().actions.loadConversations()
  }, [store])

  const title = info.title.trim()
  const handle = normalizeHandle(info.handle)
  const allowed = (check: { state: string }): boolean =>
    check.state === 'available' || check.state === 'unknown'

  const channelReady = title.length > 0 && (handle === '' || allowed(channelHandleCheck))
  const discussionReady =
    discussion.kind === 'none'
      ? true
      : discussion.kind === 'existing'
        ? discussion.conversationId !== ''
        : discussion.title.trim().length > 0 &&
          (discussion.handle.trim().length === 0 || allowed(groupHandleCheck))

  async function submit(): Promise<void> {
    setBusy(true)
    try {
      const channel = await createChannel(account, {
        title,
        description: info.description.trim().length === 0 ? null : info.description.trim(),
        isPublic: info.isPublic,
      })

      if (handle !== '') {
        try {
          await setChannelHandle(account, channel.conversationId, handle)
        } catch (error) {
          console.warn('[create] the channel handle was not set', error)
          toast.notify({ kind: 'error', message: t('create.handleNotSet') })
        }
      }

      const linked = await linkDiscussion(account, channel.conversationId, discussion)
      if (!linked && discussion.kind !== 'none') {
        // The channel exists; the link does not. Saying so is better than leaving
        // the reader looking for comments that have nowhere to go.
        toast.notify({ kind: 'error', message: t('createChannel.linkFailed') })
      }

      await store.getState().actions.loadConversations()
      void navigate(chatPath(channel.conversationId), { replace: true })
    } catch (cause) {
      fail(cause)
      setBusy(false)
    }
  }

  return (
    <CreateWizard
      title={t('createChannel.title')}
      stepLabels={STEPS.map((key) => t(key))}
      step={step}
      onClose={() => {
        void navigate(ROUTES.app)
      }}
      footer={
        step === LAST_STEP ? (
          <Button
            loading={busy}
            disabled={!channelReady || !discussionReady}
            onClick={() => {
              void submit()
            }}
          >
            {t('createChannel.submit')}
          </Button>
        ) : (
          <>
            {step === 0 ? null : (
              <Button
                variant="secondary"
                onClick={() => {
                  setStep(step - 1)
                }}
              >
                {t('common.back')}
              </Button>
            )}
            <Button
              disabled={step === 0 && !channelReady}
              onClick={() => {
                setStep(step + 1)
              }}
            >
              {t('create.next')}
            </Button>
          </>
        )
      }
    >
      {step === 0 ? (
        <InfoStep
          cardTitle={t('createChannel.info')}
          titleLabel={t('create.title')}
          descriptionHint={t('create.descriptionHint')}
          handleHint={t('create.handleHint')}
          handleCheck={channelHandleCheck}
          values={info}
          onChange={(patch) => {
            setInfo({ ...info, ...patch })
          }}
        />
      ) : step === 1 ? (
        <SettingsCard title={t('createChannel.discussion')} description={t('createChannel.discussionHint')}>
          <SettingsChoice
            label={t('createChannel.discussion')}
            value={discussion.kind}
            onChange={(kind) => {
              setDiscussion(
                kind === 'new'
                  ? { kind: 'new', title: '', handle: '' }
                  : kind === 'existing'
                    ? { kind: 'existing', conversationId: groups.at(0)?.id ?? '' }
                    : { kind: 'none' },
              )
            }}
            options={[
              { value: 'none', label: t('createChannel.noDiscussion') },
              ...(groups.length === 0
                ? []
                : [{ value: 'existing' as const, label: t('createChannel.linkExisting') }]),
              { value: 'new', label: t('createChannel.createDiscussion') },
            ]}
          />

          {discussion.kind === 'new' ? (
            <>
              <SettingsRow label={t('create.title')} stacked>
                <Input
                  label={t('create.title')}
                  hideLabel
                  value={discussion.title}
                  maxLength={MAX_TITLE}
                  onChange={(event) => {
                    setDiscussion({ ...discussion, title: event.target.value })
                  }}
                />
              </SettingsRow>
              <SettingsRow
                label={t('create.handle')}
                description={t('createChannel.discussionHandleHint')}
                stacked
              >
                <Input
                  label={t('create.handle')}
                  hideLabel
                  value={discussion.handle}
                  maxLength={MAX_HANDLE_LENGTH}
                  autoComplete="off"
                  onChange={(event) => {
                    setDiscussion({ ...discussion, handle: event.target.value })
                  }}
                />
              </SettingsRow>
            </>
          ) : null}

          {discussion.kind === 'existing' ? (
            groups.length === 0 ? (
              <EmptyState icon={Megaphone} title={t('createChannel.noGroups')} />
            ) : (
              <ul className="flex flex-col gap-1">
                {groups.map((group) => (
                  <li key={group.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg-hover">
                      <input
                        type="radio"
                        name="linked-group"
                        checked={discussion.conversationId === group.id}
                        onChange={() => {
                          setDiscussion({ kind: 'existing', conversationId: group.id })
                        }}
                        className="size-4 shrink-0 cursor-pointer accent-accent"
                      />
                      <span className="truncate text-sm text-fg">
                        {group.title ?? t('chatList.unknownPeer')}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </SettingsCard>
      ) : (
        <CreateSummary
          title={t('createChannel.confirm')}
          rows={[
            { label: t('create.title'), value: title },
            { label: t('create.handle'), value: handle === '' ? t('create.noHandle') : handle },
            {
              label: t('create.visibility'),
              value: info.isPublic ? t('create.public') : t('create.private'),
            },
            {
              label: t('createChannel.discussion'),
              value: discussionSummary(discussion, groups, t),
            },
          ]}
        />
      )}
    </CreateWizard>
  )
}

/**
 * Creates or attaches the discussion group.
 *
 * @returns the group's id, or `null` when there is no group or the link failed —
 *          which the caller reports, because the channel already exists by then.
 */
async function linkDiscussion(
  account: Account,
  channelId: string,
  discussion: Discussion,
): Promise<string | null> {
  if (discussion.kind === 'none') {
    return null
  }

  try {
    if (discussion.kind === 'existing') {
      await setLinkedGroup(account, channelId, discussion.conversationId)
      return discussion.conversationId
    }

    const group = await createGroup(account, {
      title: discussion.title.trim(),
      description: null,
      memberIds: [],
      isPublic: false,
    })
    const groupHandle = normalizeHandle(discussion.handle)
    if (groupHandle !== '') {
      // A missing handle on the discussion group is cosmetic; the link is not.
      await setGroupHandle(account, group.conversationId, groupHandle).catch((error: unknown) => {
        console.warn('[create] the discussion handle was not set', error)
      })
    }
    await setLinkedGroup(account, channelId, group.conversationId)
    return group.conversationId
  } catch (error) {
    console.warn('[create] the discussion group could not be linked', error)
    return null
  }
}

function discussionSummary(
  discussion: Discussion,
  groups: { id: string; title: string | null }[],
  t: TFunction,
): string {
  switch (discussion.kind) {
    case 'new':
      return `${t('createChannel.createDiscussion')}: ${discussion.title.trim()}`
    case 'existing': {
      const group = groups.find((entry) => entry.id === discussion.conversationId)
      return group === undefined
        ? t('createChannel.linkExisting')
        : `${t('createChannel.linkExisting')}: ${group.title ?? ''}`
    }
    default:
      return t('create.none')
  }
}
