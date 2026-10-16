import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addConversationToFolder,
  createFolder,
  listFolders,
  removeConversationFromFolder,
  updateFolder,
  type ChatFolder,
} from '../../api/folders'
import type { ChatListRowData } from '../../hooks/useChatList'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export function ChatFolderDialog({
  open,
  folder,
  folders,
  rows,
  account,
  onClose,
  onSaved,
}: {
  open: boolean
  folder: ChatFolder | null
  folders: ChatFolder[]
  rows: ChatListRowData[]
  account: Account
  onClose: () => void
  onSaved: (folderId: string | null) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdFolder, setCreatedFolder] = useState<ChatFolder | null>(null)

  useEffect(() => {
    if (!open) return
    setName(folder?.name ?? '')
    setSelected(folder?.conversationIds ?? [])
    setError(null)
    setCreatedFolder(null)
  }, [folder, open])

  async function save(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const finalName = name.trim() || (folder === null ? nextDefaultName(folders, t) : folder.name)
      const existingFolder = folder ?? createdFolder
      const savedFolder = existingFolder ?? await createFolder(account, finalName)
      if (existingFolder === null) {
        setCreatedFolder(savedFolder)
      } else if (existingFolder.name !== finalName) {
        await updateFolder(account, existingFolder.id, { name: finalName })
      }

      const refreshed = (await listFolders(account)).find((entry) => entry.id === savedFolder.id)
      const currentFolder = refreshed ?? savedFolder
      if (folder === null) setCreatedFolder(currentFolder)

      const existing = new Set(currentFolder.conversationIds)
      const wanted = new Set(selected)
      for (const conversationId of selected) {
        if (!existing.has(conversationId)) {
          await addConversationToFolder(account, currentFolder.id, conversationId)
        }
      }
      for (const conversationId of currentFolder.conversationIds) {
        if (!wanted.has(conversationId)) {
          await removeConversationFromFolder(account, currentFolder.id, conversationId)
        }
      }

      toast.notify({ kind: 'success', message: t('chatFolders.saved') })
      onSaved(currentFolder.id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message || t('chatFolders.saveFailed'))
      toast.notify({ kind: 'error', message: message || t('chatFolders.saveFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(folder === null ? 'chatFolders.createTitle' : 'chatFolders.editTitle')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={busy} onClick={() => { void save() }}>{t('settings.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          {t('chatFolders.name')}
          <input
            autoFocus
            maxLength={64}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('chatFolders.namePlaceholder')}
            className="h-10 rounded-lg border border-border bg-bg px-3 text-sm font-normal text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
        <div className="flex min-h-0 flex-col gap-2">
          <p className="text-sm font-medium text-fg">{t('chatFolders.chooseChats')}</p>
          {rows.length === 0 ? (
            <p className="rounded-lg border border-border bg-bg p-3 text-sm text-fg-muted">{t('chatFolders.noChats')}</p>
          ) : (
            <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {rows.map((row) => {
                const checked = selected.includes(row.conversation.id)
                return (
                  <li key={row.conversation.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-bg-hover">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelected((current) => checked
                          ? current.filter((id) => id !== row.conversation.id)
                          : [...current, row.conversation.id])}
                        className="size-4 shrink-0 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{row.title}</span>
                        {row.preview === null ? null : <span className="block truncate text-xs text-fg-muted">{row.preview}</span>}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {error === null ? null : <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}

function nextDefaultName(folders: ChatFolder[], t: (key: 'chatFolders.defaultName', options: { count: number }) => string): string {
  const existing = new Set(folders.map((folder) => folder.name.toLocaleLowerCase()))
  let count = 1
  while (existing.has(t('chatFolders.defaultName', { count }).toLocaleLowerCase())) count += 1
  return t('chatFolders.defaultName', { count })
}
