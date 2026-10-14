import { api } from './api';

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export async function uploadTrendPhotos(trendId, files) {
  const { uploads } = await api('/trends/uploads/presign', {
    method: 'POST',
    body: { trendId, files: files.map((file) => ({ mimeType: file.type, size: file.size })) },
  });
  const keys = [];
  for (let index = 0; index < files.length; index++) {
    const upload = uploads[index];
    let response;
    try {
      response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: upload.headers,
        body: files[index],
        credentials: 'omit',
        signal: AbortSignal.timeout(120000),
      });
    } catch {
      throw new Error('Не удалось загрузить фотографию. Проверьте подключение и попробуйте снова.');
    }
    if (!response.ok) throw new Error('Загрузка фотографии не завершена. Попробуйте снова.');
    const { image } = await api('/trends/uploads/complete', {
      method: 'POST',
      body: { uploadId: upload.uploadId },
    });
    keys.push(image.key);
  }
  return keys;
}
