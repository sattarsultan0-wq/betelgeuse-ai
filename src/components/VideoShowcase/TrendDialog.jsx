import { useEffect, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../UI/Modal';
import { useAuth } from '../../context/AuthContext';
import { useGeneration } from '../../hooks/useGeneration';
import { downloadVideo } from '../../services/api';
import { PHOTO_TYPES, MAX_PHOTO_BYTES } from '../../services/trendUploads';
import useInlineVideo from '../../hooks/useInlineVideo';

const labels = {
  idle: 'Добавьте фотографии',
  uploading: 'Загружаем и проверяем фотографии…',
  queued: 'Видео ожидает обработки',
  processing: 'Higgsfield создаёт видео…',
  completed: 'Видео готово',
  failed: 'Не удалось завершить запрос',
};
function PhotoSlot({ index, file, disabled, onChange, onRemove }) {
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
          <img src={preview} alt={`Фотография ${index + 1}`} />
        ) : (
          <>
            <ImagePlus size={25} />
            <span>Фото {index + 1}</span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-label={`${file ? 'Заменить' : 'Добавить'} фотографию ${index + 1}`}
          onChange={(event) => {
            onChange(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {file && <span className="trend-photo-replace">Заменить</span>}
      </label>
      {file && (
        <button
          className="icon-button trend-photo-remove"
          disabled={disabled}
          aria-label={`Удалить фотографию ${index + 1}`}
          onClick={onRemove}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export default function TrendDialog({ item, onClose }) {
  const { user, setDialog, refresh } = useAuth();
  const trendId = item.trendId || item.id;
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
  const video = useInlineVideo(videoSrc, { group: 'dialog', autoplay: false });
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
    await submitTrend(trendId, photos);
    refresh().catch(() => {});
  }
  const closingBlocked =
    phase === 'uploading' || (phase === 'queued' && !generation && !recovering);
  return (
    <Modal
      title={item.title}
      className="trend-modal"
      onClose={() => {
        if (!closingBlocked) onClose();
      }}
    >
      <div className="trend-layout">
        <div className="trend-video-panel">
          <span className="eyebrow">{completed ? 'ТВОЙ РЕЗУЛЬТАТ' : 'ПРИМЕР ТРЕНДА'}</span>
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
            <p className="error" role="alert">
              {mediaError}
            </p>
          )}
          {completed && (
            <div className="trend-actions">
              <button
                className="glass-button"
                onClick={() => downloadVideo(generation.id).catch((err) => setError(err.message))}
              >
                <Download size={16} /> Скачать
              </button>
              <button
                className="glass-button"
                onClick={() => {
                  reset();
                  setFiles([]);
                  setMediaError('');
                }}
              >
                Создать ещё
              </button>
            </div>
          )}
        </div>
        <div className="trend-form-panel">
          <span className="eyebrow">СОЗДАЙ СВОЮ ВЕРСИЮ</span>
          <h3>Твоё лицо. Новый сюжет.</h3>
          <p className="trend-instruction">
            Загрузите качественную фотографию, на которой лицо хорошо видно, человек смотрит прямо в
            камеру, освещение равномерное
          </p>
          <p className="muted">
            {minPhotos === maxPhotos ? `${minPhotos} фото` : `От ${minPhotos} до ${maxPhotos} фото`}{' '}
            · JPEG, PNG, WebP · до 10 МБ каждое
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
            <span>{labels[phase]}</span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!item.available && !generation && !pendingSubmission && !recovering && (
            <p className="muted">
              {item.unavailableReason || 'Тренд пока недоступен для генерации.'}
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
                  (!item.available || photos.length < minPhotos))
              }
            >
              <Sparkles size={17} />
              {!user
                ? 'Войти для генерации'
                : pendingSubmission || recovering
                  ? 'Проверить запрос'
                  : 'Сгенерировать видео'}
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
              Создать ещё
            </button>
          )}
          {user && (
            <p className="muted">
              {user.isAdmin
                ? 'Администратор · без списания кредитов'
                : `Доступная квота: ${user.generationCredits} · Стоимость: ${item.quotaCost || 1} ед.`}
            </p>
          )}
          {generation && (
            <Link className="text-button" to="/library" onClick={onClose}>
              Посмотреть в библиотеке
            </Link>
          )}
          {busy && generation && (
            <p className="muted">Можно закрыть окно. Видео появится в вашей библиотеке.</p>
          )}
          {closingBlocked && (
            <p className="muted">Дождитесь завершения загрузки и подтверждения запроса.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
