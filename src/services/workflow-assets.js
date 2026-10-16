import { api } from './api';

let database;
const uploads = new Map();
function openDatabase() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('betelgeuse:workflow-assets', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Не удалось сохранить файл на этом устройстве.'));
    }).catch((error) => {
      database = null;
      throw error;
    });
  return database;
}
async function access(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('assets', mode);
    const request = operation(transaction.objectStore('assets'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(new Error('Не удалось сохранить файл на этом устройстве.'));
    transaction.onabort = transaction.onerror;
  });
}
export const loadWorkflowAsset = (id) => access('readonly', (store) => store.get(id));
export function validateNodeFile(file, type) {
  const allowed =
    type === 'image' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm'];
  const limit = (type === 'image' ? 10 : 50) * 1024 * 1024;
  if (!allowed.includes(file.type))
    return type === 'image' ? 'Выберите JPG, JPEG, PNG или WEBP.' : 'Выберите MP4 или WEBM.';
  if (!file.size || file.size > limit)
    return `Допустимый размер файла — до ${limit / 1024 / 1024} МБ.`;
  return '';
}
export async function saveWorkflowAsset(userId, file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const id = `${userId}:${Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('')}`;
  const existing = await loadWorkflowAsset(id);
  if (existing) return existing;
  const record = { id, blob: file, fileName: file.name, mimeType: file.type, size: file.size };
  await access('readwrite', (store) => store.put(record));
  return record;
}
export async function uploadWorkflowAsset(assetId) {
  if (uploads.has(assetId)) return uploads.get(assetId);
  const work = (async () => {
    const record = await loadWorkflowAsset(assetId);
    if (!record) throw new Error('Файл не найден на этом устройстве. Добавьте его заново.');
    // WEBM can be previewed locally; the existing provider upload accepts MP4.
    if (record.uploadId || record.mimeType === 'video/webm') return record;
    const form = new FormData();
    const image = record.mimeType.startsWith('image/');
    form.append(image ? 'image' : 'file', record.blob, record.fileName);
    const result = await api(image ? '/uploads' : '/uploads/references', {
      method: 'POST',
      body: form,
    });
    const saved = { ...record, uploadId: result.image.id };
    await access('readwrite', (store) => store.put(saved));
    return saved;
  })();
  uploads.set(assetId, work);
  try {
    return await work;
  } finally {
    uploads.delete(assetId);
  }
}
export async function removeWorkflowAsset(assetId, shouldRemove = () => true) {
  await uploads.get(assetId)?.catch(() => {});
  if (!shouldRemove()) return;
  await access('readwrite', (store) => store.delete(assetId));
}
