// Хранилище галереи поверх IndexedDB: элементы (kind 'doc'/'folder'), папки,
// перемещение, переименование, дублирование, рекурсивное удаление.
import { saveDoc, getDoc, listDocs, removeDoc } from '../../core/storage.js';

export const uid = (p = 'd') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const listAll = () => listDocs();
export const childrenOf = async (folder) => (await listDocs()).filter((d) => (d.folder ?? null) === (folder ?? null));
export const getItem = getDoc;

export async function createFolder(name, childIds, parent = null) {
  const id = uid('f');
  await saveDoc({ id, kind: 'folder', name, folder: parent ?? null, order: Date.now(), updated: Date.now() });
  for (const cid of childIds) { const d = await getDoc(cid); if (d) { d.folder = id; await saveDoc(d); } }
  return id;
}

export async function moveToFolder(ids, folder) {
  for (const cid of ids) { const d = await getDoc(cid); if (d) { d.folder = folder ?? null; d.updated = Date.now(); await saveDoc(d); } }
}

export async function setOrder(id, order) { const d = await getDoc(id); if (d) { d.order = order; await saveDoc(d); } }
export async function renameItem(id, name) { const d = await getDoc(id); if (d) { d.name = name; d.updated = Date.now(); await saveDoc(d); } }

export async function removeItem(id) { for (const k of await childrenOf(id)) await removeItem(k.id); await removeDoc(id); }

export async function duplicateItem(id, parent) { const d = await getDoc(id); if (!d) return;
  const nid = uid(d.kind === 'folder' ? 'f' : 'd');
  await saveDoc({ ...d, id: nid, folder: parent ?? d.folder ?? null, name: d.name + ' копия', updated: Date.now(), order: Date.now() });
  if (d.kind === 'folder') for (const k of await childrenOf(id)) await duplicateItem(k.id, nid);
}

export async function folderPreviews(folderId) { return (await childrenOf(folderId)).slice(0, 4).map((d) => d.preview).filter(Boolean); }
