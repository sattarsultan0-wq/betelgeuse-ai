import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal from '../UI/Modal';
import { downloadImage, downloadVideo } from '../../services/api';

export default function MaterialDialog({ item, onClose }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const image = item?.kind === 'image' || item?.resultImageUrl;
  return (
    <Modal
      open={!!item}
      title={image ? 'Изображение' : 'Результат генерации'}
      onClose={onClose}
      className="wf-material-dialog"
    >
      {item && (
        <>
          {image ? (
            <img
              src={item.resultImageUrl || item.url}
              crossOrigin="use-credentials"
              alt={item.name || 'Изображение'}
            />
          ) : item.resultVideoUrl ? (
            <video
              key={item.id}
              src={item.resultVideoUrl}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <p className="muted">Материал ещё не готов.</p>
          )}
          <p className="wf-material-prompt">{item.prompt || item.name}</p>
          <div className="wf-material-meta">
            <span>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
            {(item.kind === 'image' || (!image && item.resultVideoUrl)) && (
              <button
                className="glass-button compact"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await (item.kind === 'image' ? downloadImage(item.id) : downloadVideo(item.id));
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download size={15} />
                {busy ? 'Скачивание…' : 'Скачать'}
              </button>
            )}
          </div>
          {error && (
            <p className="wf-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
