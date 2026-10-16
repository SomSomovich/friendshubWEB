import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listContacts, type Contact } from '../api/contacts'
import { createGroup, setGroupHandle } from '../api/groups'
import { CreateSummary } from '../components/create/CreateSummary'
import { CreateWizard } from '../components/create/CreateWizard'
import { InfoStep, type InfoValues } from '../components/create/InfoStep'
import { MemberPicker } from '../components/create/MemberPicker'
import { SettingsCard } from '../components/settings/Section'
import { Button } from '../components/ui/Button'
import { ensureSenderKeyDistributed } from '../crypto/groups'
import { useActionReporter } from '../hooks/useActionReporter'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useHandleAvailability } from '../hooks/useHandleAvailability'
import { useToast } from '../hooks/useToast'
import { ROUTES, chatPath } from '../router/paths'
import { requireAccountStore } from '../state/accountRegistry'
import { rememberTemporaryRoomExpiry } from '../storage/temporaryRooms'
import type { Account } from '../types'
import { normalizeHandle } from '../utils/handle'

const STEPS = ['create.steps.info', 'create.steps.members', 'create.steps.confirm'] as const
const LAST_STEP = STEPS.length - 1

/**
 * Creating a group: what it is, who starts in it, and a last look.
 *
 * Split in two so the wizard's hooks run with an account that is known to exist;
 * a nullable one threaded through every closure buys nothing.
 *
 * Members are picked from the contact list, which is the only source of account
 * ids for people the API offers — see `MemberPicker`.
 */
export function CreateGroupScreen() {
  const account = useActiveAccount()
  const [searchParams] = useSearchParams()
  const rawExpiry = searchParams.get('expiresInSeconds')
  const parsedExpiry = rawExpiry === null ? NaN : Number(rawExpiry)
  const expiresInSeconds = Number.isInteger(parsedExpiry) && parsedExpiry >= 60 && parsedExpiry <= 7 * 24 * 60 * 60
    ? parsedExpiry
    : undefined
  if (account === null) {
    return null
  }
  return <GroupWizard key={`${account.id}:${expiresInSeconds ?? 'permanent'}`} account={account} expiresInSeconds={expiresInSeconds} />
}

function GroupWizard({ account, expiresInSeconds }: { account: Account; expiresInSeconds?: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const fail = useActionReporter('groups')

  const [step, setStep] = useState(0)
  const [info, setInfo] = useState<InfoValues>({
    title: '',
    description: '',
    handle: '',
    isPublic: false,
  })
  const [selected, setSelected] = useState<string[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const handleCheck = useHandleAvailability(account, info.handle, info.handle.trim().length > 0)

  useEffect(() => {
    let cancelled = false
    void listContacts(account)
      .then((loaded) => {
        if (!cancelled) {
          setContacts(loaded)
        }
      })
      .catch((error: unknown) => {
        // The group can still be created without them, just empty.
        console.warn('[create] the contact list could not be read', error)
      })
      .finally(() => {
        if (!cancelled) {
          setContactsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [account])

  const title = info.title.trim()
  const handle = normalizeHandle(info.handle)
  const titleReady = title.length > 0
  // An unverified handle is allowed through: the check is a courtesy, and the
  // server is the authority on the name.
  const handleReady =
    handle === '' || handleCheck.state === 'available' || handleCheck.state === 'unknown'

  const selectedNames = selected
    .map((id) => contacts.find((contact) => contact.targetAccountId === id))
    .map((contact) => contact?.localUsername ?? contact?.username ?? '')
    .filter((name) => name.length > 0)

  async function submit(): Promise<void> {
    setBusy(true)
    try {
      const created = await createGroup(account, {
        title,
        description: info.description.trim().length === 0 ? null : info.description.trim(),
        memberIds: selected,
        isPublic: info.isPublic,
        ...(expiresInSeconds === undefined ? {} : { expiresInSeconds }),
      })

      if (expiresInSeconds !== undefined) {
        try {
          await rememberTemporaryRoomExpiry(
            account.id,
            created.conversationId,
            created.createdAt + expiresInSeconds,
          )
        } catch (error) {
          // The backend still enforces expiry; this local record only powers a
          // helpful warning before scheduling a message on this device.
          console.warn('[create] the local temporary-room expiry was not saved', error)
        }
      }

      if (handle !== '') {
        try {
          await setGroupHandle(account, created.conversationId, handle)
        } catch (error) {
          // The group exists; only the name did not stick, and saying so is the
          // honest outcome. It can be set again from the group's profile.
          console.warn('[create] the group handle was not set', error)
          toast.notify({ kind: 'error', message: t('create.handleNotSet') })
        }
      }

      if (selected.length > 0) {
        try {
          // Distributing here means the members can read the first message the
          // moment it arrives, instead of the send path doing it inside it.
          await ensureSenderKeyDistributed(account, created.conversationId, selected)
        } catch (error) {
          // The send path retries this before the first message, so failing here
          // costs a little time later and nothing else.
          console.warn('[create] the sender key was not distributed', error)
        }
      }

      await requireAccountStore(account.id).getState().actions.loadConversations()
      void navigate(chatPath(created.conversationId), { replace: true })
    } catch (cause) {
      fail(cause)
      setBusy(false)
    }
  }

  return (
    <CreateWizard
      title={t(expiresInSeconds === undefined ? 'createGroup.title' : 'temporaryRooms.createTitle')}
      stepLabels={STEPS.map((key) => t(key))}
      step={step}
      onClose={() => {
        void navigate(ROUTES.app)
      }}
      footer={
        step === LAST_STEP ? (
          <Button
            loading={busy}
            disabled={!titleReady || !handleReady}
            onClick={() => {
              void submit()
            }}
          >
            {t('createGroup.submit')}
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
              disabled={step === 0 && (!titleReady || !handleReady)}
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
          cardTitle={t('createGroup.info')}
          titleLabel={t('create.title')}
          descriptionHint={t('create.descriptionHint')}
          handleHint={t('create.handleHint')}
          handleCheck={handleCheck}
          values={info}
          onChange={(patch) => {
            setInfo({ ...info, ...patch })
          }}
        />
      ) : step === 1 ? (
        <SettingsCard title={t('createGroup.members')} description={t('createGroup.membersHint')}>
          <MemberPicker
            contacts={contacts}
            loading={contactsLoading}
            selected={selected}
            onToggle={(accountId) => {
              setSelected(
                selected.includes(accountId)
                  ? selected.filter((id) => id !== accountId)
                  : [...selected, accountId],
              )
            }}
          />
        </SettingsCard>
      ) : (
        <CreateSummary
          title={t('createGroup.confirm')}
          rows={[
            { label: t('create.title'), value: title },
            { label: t('create.handle'), value: handle === '' ? t('create.noHandle') : handle },
            ...(expiresInSeconds === undefined ? [] : [{
              label: t('temporaryRooms.expiresIn'),
              value: t('temporaryRooms.durationValue', {
                hours: Math.floor(expiresInSeconds / 3600),
                minutes: Math.floor((expiresInSeconds % 3600) / 60),
              }),
            }]),
            {
              label: t('create.visibility'),
              value: info.isPublic ? t('create.public') : t('create.private'),
            },
            {
              label: t('createGroup.members'),
              value:
                selectedNames.length === 0
                  ? t('create.noMembers')
                  : t('createGroup.memberCount', { count: selectedNames.length }),
            },
          ]}
          note={selectedNames.join(', ')}
        />
      )}
    </CreateWizard>
  )
}
