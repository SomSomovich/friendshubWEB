import type { AccountAuth } from './auth'
import { del, get, patch, post } from './client'

export type ChatFolder = {
  id: string
  name: string
  position: number
  conversationIds: string[]
  createdAt: number
  updatedAt: number
}

export function listFolders(account: AccountAuth): Promise<ChatFolder[]> {
  return get<ChatFolder[]>('/folders', { account })
}

export function createFolder(account: AccountAuth, name: string): Promise<ChatFolder> {
  return post<ChatFolder>('/folders', { name }, { account })
}

export function updateFolder(
  account: AccountAuth,
  folderId: string,
  changes: { name?: string; position?: number },
): Promise<void> {
  return patch<void>(`/folders/${encodeURIComponent(folderId)}`, changes, { account })
}

export function deleteFolder(account: AccountAuth, folderId: string): Promise<void> {
  return del<void>(`/folders/${encodeURIComponent(folderId)}`, undefined, { account })
}

export function addConversationToFolder(
  account: AccountAuth,
  folderId: string,
  conversationId: string,
): Promise<void> {
  return post<void>(
    `/folders/${encodeURIComponent(folderId)}/items`,
    { conversation_id: conversationId },
    { account },
  )
}

export function removeConversationFromFolder(
  account: AccountAuth,
  folderId: string,
  conversationId: string,
): Promise<void> {
  return del<void>(
    `/folders/${encodeURIComponent(folderId)}/items/${encodeURIComponent(conversationId)}`,
    undefined,
    { account },
  )
}
