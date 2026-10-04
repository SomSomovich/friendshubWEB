import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listOwnDevices, revokeDevice, type OwnDevice } from '../../api/devices'
import { forgetAccount } from '../../auth/session'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { formatFullTimestamp } from '../../utils/chatTime'
import { nowSeconds } from '../../utils/time'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { SettingsCard } from './Section'
import { ConfirmDialog } from '../ui/ConfirmDialog'

/**
 * How old this browser's own device has to be before it may revoke another one
 * of the account's devices (API_FRONTEND.txt §7).
 */
const TRUSTED_AGE_SECONDS = 3 * 24 * 3_600

/**
 * This account's devices.
 *
 * A device can always revoke itself; revoking someone else's — another browser
 * signed into the same account — is only allowed from device 1 or from a device
 * more than three days old, which the server enforces and this mirrors so the
 * button is never offered where it would be refused.
 */
export function DevicesPanel({ account }: { account: Account }) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('devices')

  const [devices, setDevices] = useState<OwnDevice[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<OwnDevice | null>(null)
  const [revision, setRevision] = useState(0)

  // One read path: the first load and every refresh after a revocation both come
  // through here, so the list cannot end up showing two different truths.
  useEffect(() => {
    let cancelled = false

    void listOwnDevices(account)
      .then((loaded) => {
        if (!cancelled) {
          setDevices(loaded)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          fail(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, revision, fail])

  const mine = devices?.find((device) => device.deviceNumber === account.deviceNumber) ?? null
  // Not knowing our own device is not a licence to revoke the others: the rule
  // is a safety property, and an unknown device is exactly when it matters most.
  const mayRevokeOthers = myDeviceIsTrusted(mine)

  async function revoke(device: OwnDevice): Promise<void> {
    const isSelf = device.deviceNumber === account.deviceNumber
    setBusyId(device.id)
    try {
      await revokeDevice(account, device.id)
      setPending(null)

      if (isSelf) {
        // A device that revokes itself ends its own session, so this browser has
        // nothing left to keep: forget the account rather than sit on a dead one.
        toast.notify({ kind: 'info', message: t('settings.security.deviceSelfRevoked') })
        await forgetAccount(account)
        return
      }
      setRevision((value) => value + 1)
      toast.notify({ kind: 'success', message: t('settings.security.deviceRevoked') })
    } catch (error) {
      fail(error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SettingsCard title={t('settings.security.devices')} description={t('settings.security.devicesHint')}>
      {devices === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => {
            const isCurrent = device.deviceNumber === account.deviceNumber
            const revocable = isCurrent || mayRevokeOthers

            return (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm text-fg">
                    <span className="truncate">{device.name}</span>
                    <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                      №{device.deviceNumber}
                    </span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">
                        {t('settings.security.currentDevice')}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {t('settings.security.deviceAdded', {
                      time: formatFullTimestamp(device.createdAt, i18n.language),
                    })}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!revocable || busyId !== null}
                  title={revocable ? undefined : t('settings.security.deviceNotTrusted')}
                  loading={busyId === device.id}
                  onClick={() => {
                    setPending(device)
                  }}
                >
                  {t('settings.security.revoke')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {mayRevokeOthers ? null : (
        <p className="border-t border-border pt-3 text-xs text-pretty text-fg-muted">
          {t('settings.security.deviceNotTrusted')}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={t('settings.security.revokeDevice')}
        description={
          pending !== null && pending.deviceNumber === account.deviceNumber
            ? t('settings.security.revokeSelfHint')
            : t('settings.security.revokeDeviceHint')
        }
        confirmLabel={t('settings.security.revoke')}
        danger
        busy={busyId !== null}
        onConfirm={() => {
          if (pending !== null) {
            void revoke(pending)
          }
        }}
        onClose={() => {
          setPending(null)
        }}
      />
    </SettingsCard>
  )
}

/** Device 1, or any device older than three days, may revoke its siblings. */
function myDeviceIsTrusted(device: OwnDevice | null): boolean {
  if (device === null) {
    return false
  }
  return device.deviceNumber === 1 || nowSeconds() - device.createdAt > TRUSTED_AGE_SECONDS
}
