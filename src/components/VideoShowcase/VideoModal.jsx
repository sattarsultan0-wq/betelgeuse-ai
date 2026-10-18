import { useI18n } from '../../i18n/index';
import { priceLabel, generationPriceLabel } from '../../services/pricing';
import { useEffect, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../UI/Modal';
import { useAuth } from '../../context/AuthContext';
import { useGeneration } from '../../hooks/useGeneration';
import { downloadVideo } from '../../services/api';
import { PHOTO_TYPES, MAX_PHOTO_BYTES } from '../../services/trendUploads';
import useInlineVideo from '../../hooks/useInlineVideo';
import useGenerationPrice from '../../hooks/useGenerationPrice';
import GenerationPrice from '../Pricing/GenerationPrice';

const labels = {
  idle: 'Добавьте фотографии',
  uploading: 'Загружаем и проверяем фотографии…',
  queued: 'Видео ожидает обработки',
  processing: 'Higgsfield создаёт видео…',
  completed: 'Видео готово',
  failed: 'Не удалось завершить запрос',
};
function PhotoSlot({ index, file, disabled, onChange, onRemove }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="trend-photo-slot">
      <label className={`trend-photo-picker ${disabled ? 'disabled' : ''}`}>
        {preview ? (
          <img src={preview} alt={t('Фотография {{v0}}', { v0: index + 1 })} />
        ) : (
          <>
            <ImagePlus size={25} />
            <span>
              {t('Фото ')}
              {t(index + 1)}
            </span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-label={t(file ? 'Заменить фотографию {{v0}}' : 'Добавить фотографию {{v0}}', {
            v0: index + 1,
          })}
          onChange={(event) => {
            onChange(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {file && <span className="trend-photo-replace">{t('Заменить')}</span>}
      </label>
      {file && (
        <button
          className="icon-button trend-photo-remove"
          disabled={disabled}
          aria-label={t('Удалить фотографию {{v0}}', { v0: index + 1 })}
          onClick={onRemove}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function VideoModalContent({ item, onClose, open, onExitComplete }) {
  const { t } = useI18n();
  const { user, setDialog, refresh } = useAuth();
  const trendId = item.trendId || item.id;
  const { quote } = useGenerationPrice(
    user && item.available ? { trendId } : null,
    '/trends/estimate',
  );
  const [files, setFiles] = useState([]),
    [mediaError, setMediaError] = useState('');
  const {
    generation,
    phase,
    error,
    setError,
    busy,
    submitTrend,
    reset,
    pendingSubmission,
    recovering,
  } = useGeneration(user?.id, trendId);
  const maxPhotos = item.maxPhotos || 1,
    minPhotos = item.minPhotos || 1;
  const photos = files.filter(Boolean);
  const completed = generation?.status === 'completed';
  const videoSrc = completed ? generation.resultVideoUrl : item.src;
  const video = useInlineVideo(videoSrc, { group: 'dialog', autoplay: false, loadOnMount: true });
  const frozen = busy || pendingSubmission || recovering || !!generation;
  useEffect(() => {
    setFiles([]);
  }, [user?.id]);
  useEffect(() => {
    if (user && ['completed', 'failed'].includes(generation?.status)) refresh().catch(() => {});
  }, [generation?.status]);
  function choose(index, file) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('Поддерживаются JPEG, PNG и WebP.');
      return;
    }
    if (!file.size || file.size > MAX_PHOTO_BYTES) {
      setError('Размер фотографии должен быть от 1 байта до 10 МБ.');
      return;
    }
    setError('');
    setFiles((current) => {
      const next = [...current];
      next[index] = file;
      return next;
    });
  }
  async function generate() {
    if (!user) {
      onClose();
      setDialog('login');
      return;
    }
    if (!item.available && !pendingSubmission && !recovering) {
      setError(item.unavailableReason || 'Тренд пока недоступен.');
      return;
    }
    if (!pendingSubmission && !recovering && photos.length < minPhotos) {
      setError(`Добавьте минимум ${minPhotos} фотографий.`);
      return;
    }
    if (!pendingSubmission && !recovering && !quote?.canGenerate) {
      setError(quote?.sufficientBalance === false ? 'Недостаточно кредитов.' : 'Цена не указана');
      return;
    }
    await submitTrend(trendId, photos, quote?.priceConfirmation);
    refresh().catch(() => {});
  }
  const closingBlocked =
    phase === 'uploading' || (phase === 'queued' && !generation && !recovering);
  return (
    <Modal
      open={open}
      onExitComplete={onExitComplete}
      title={t(item.title)}
      className="trend-modal"
      onClose={() => {
        if (!closingBlocked) {
          video.pause({ release: true });
          onClose();
        }
      }}
    >
      <div className="trend-layout">
        <div className="trend-video-panel">
          <span className="eyebrow">{t(completed ? 'ТВОЙ РЕЗУЛЬТАТ' : 'ПРИМЕР ТРЕНДА')}</span>
          <video
            ref={video.ref}
            src={videoSrc}
            poster={completed ? undefined : item.poster}
            controls
            playsInline
            preload="metadata"
            onError={() => setMediaError('Видео не удалось загрузить. Проверьте подключение.')}
            onLoadedData={() => setMediaError('')}
          />
          {mediaError && (
            <div>
              <p className="error" role="alert">
                {t(mediaError)}
              </p>
              <button
                className="glass-button compact"
                onClick={() => {
                  setMediaError('');
                  video.play();
                }}
              >
                {t('Повторить загрузку')}
              </button>
            </div>
          )}
          {completed && (
            <div className="trend-actions">
              <button
                className="glass-button"
                onClick={() => downloadVideo(generation.id).catch((err) => setError(err.message))}
              >
                <Download size={16} />
                {t(' Скачать')}
              </button>
              <button
                className="glass-button"
                onClick={() => {
                  reset();
                  setFiles([]);
                  setMediaError('');
                }}
              >
                {t('Создать ещё')}
              </button>
            </div>
          )}
        </div>
        <div className="trend-form-panel">
          <span className="eyebrow">{t('СОЗДАЙ СВОЮ ВЕРСИЮ')}</span>
          <h3>{t('Твоё лицо. Новый сюжет.')}</h3>
          <p className="trend-instruction">
            {t(
              'Загрузите качественную фотографию, на которой лицо хорошо видно, человек смотрит прямо в камеру, освещение равномерное',
            )}
          </p>
          <p className="muted">
            {t(
              minPhotos === maxPhotos
                ? `${minPhotos} фото`
                : `От ${minPhotos} до ${maxPhotos} фото`,
            )}{' '}
            {t('· JPEG, PNG, WebP · до 10 МБ каждое')}
          </p>
          <div className="trend-photos">
            {Array.from({ length: maxPhotos }, (_, index) => (
              <PhotoSlot
                key={index}
                index={index}
                file={files[index]}
                disabled={frozen}
                onChange={(file) => choose(index, file)}
                onRemove={() => {
                  setFiles((current) => current.map((file, i) => (i === index ? null : file)));
                  setError('');
                }}
              />
            ))}
          </div>
          <div className="trend-status" role="status" aria-live="polite">
            {busy && <LoaderCircle size={18} className="spin" />}
            <span>{t(labels[phase])}</span>
          </div>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          {!item.available && !generation && !pendingSubmission && !recovering && (
            <p className="muted">
              {t(item.unavailableReason || 'Тренд пока недоступен для генерации.')}
            </p>
          )}
          {!completed && (
            <button
              className="glass-button primary trend-generate"
              onClick={generate}
              disabled={
                busy ||
                !!generation ||
                (user &&
                  !pendingSubmission &&
                  !recovering &&
                  (!item.available || !quote?.canGenerate || photos.length < minPhotos))
              }
            >
              <Sparkles size={17} />
              {t(
                !user
                  ? 'Войти для генерации'
                  : pendingSubmission || recovering
                    ? 'Проверить запрос'
                    : 'Сгенерировать видео',
              )}
            </button>
          )}
          {generation?.status === 'failed' && !generation.requiresReview && (
            <button
              className="glass-button"
              onClick={() => {
                reset();
                setFiles([]);
              }}
            >
              {t('Создать ещё')}
            </button>
          )}
          {user && (
            <small>
              {generation ? (
                generationPriceLabel(generation, t)
              ) : (
                <GenerationPrice quote={user ? quote : item.pricing} />
              )}
            </small>
          )}
          {user && (
            <p className="muted">
              {t(
                user.isAdmin
                  ? 'Администратор · без списания кредитов'
                  : `Доступно ${user.generationCredits} кредитов`,
              )}
            </p>
          )}
          {generation && (
            <Link className="text-button" to="/library" onClick={onClose}>
              {t('Посмотреть в библиотеке')}
            </Link>
          )}
          {busy && generation && (
            <p className="muted">{t('Можно закрыть окно. Видео появится в вашей библиотеке.')}</p>
          )}
          {closingBlocked && (
            <p className="muted">{t('Дождитесь завершения загрузки и подтверждения запроса.')}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Keep the existing dialog mounted through its exit animation, then release its resources.
export default function VideoModal({ item, onClose }) {
  const [closingItem, setClosingItem] = useState(null);
  const current = item || closingItem;
  if (!current) return null;
  return (
    <VideoModalContent
      key={current.trendId || current.id}
      item={current}
      open={!!item}
      onClose={() => {
        setClosingItem(current);
        onClose();
      }}
      onExitComplete={() => setClosingItem(null)}
    />
  );
}
