import { useI18n } from '../../i18n/index';
import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal from '../UI/Modal';
import { downloadImage, downloadVideo } from '../../services/api';
import GenerationPending, { FrameTracing, isGenerationActive } from './GenerationPending';

export default function MaterialDialog({ item, onClose }) {
  const { t, locale } = useI18n();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const image =
    item?.kind === 'image' ||
    item?.generationType === 'Image' ||
    item?.resultImageUrl ||
    item?.resultImageUrls?.length;
  const active = isGenerationActive(item?.status);
  return (
    <Modal
      open={!!item}
      title={t(image ? 'Изображение' : 'Результат генерации')}
      onClose={onClose}
      className="wf-material-dialog"
    >
      {item && (
        <>
          {active && <FrameTracing />}
          {active ? (
            <GenerationPending />
          ) : item.status === 'failed' ? (
            <p className="wf-error" role="alert">
              {t(item.errorMessage || 'Генерация не завершена.')}
            </p>
          ) : image ? (
            <img
              src={item.resultImageUrl || item.resultImageUrls?.[0] || item.url}
              alt={item.name || t('Изображение')}
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
            <p className="muted">{t('Материал ещё не готов.')}</p>
          )}
          <p className="wf-material-prompt">{item.prompt || item.name}</p>
          <div className="wf-material-meta">
            <span>{t(new Date(item.createdAt).toLocaleString(locale))}</span>
            {image &&
              item.kind !== 'image' &&
              (item.resultImageUrl || item.resultImageUrls?.length) && (
                <a
                  className="glass-button compact"
                  href={item.resultImageUrl || item.resultImageUrls?.[0]}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Открыть оригинал')}
                </a>
              )}
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
                {t(busy ? 'Скачивание…' : 'Скачать')}
              </button>
            )}
          </div>
          {error && (
            <p className="wf-error" role="alert">
              {t(error)}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
