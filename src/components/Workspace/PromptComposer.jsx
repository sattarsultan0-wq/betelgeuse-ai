import { useI18n } from '../../i18n/index';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { workspaceModels } from '../../assets/aiModels';
import useGenerationPrice from '../../hooks/useGenerationPrice';
import { priceLabel } from '../../services/pricing';
import GenerationPrice from '../Pricing/GenerationPrice';

const modeNames = { TEXT_TO_VIDEO: 'Текст → Видео', IMAGE_TO_VIDEO: 'Фото → Видео' };
function modelDescription(item, t) {
  if (item.provider) return t('{{v0}} · провайдер Kling / Seedance', { v0: t(item.type) });
  return `${t(item.type)} · ${priceLabel(item.api?.pricing, t)}`;
}

export default function PromptComposer({
  user,
  apiModels,
  modelError,
  prompt,
  setPrompt,
  source,
  onClearSource,
  onSubmit,
  submitting,
  pendingRequest,
  onRetry,
  loading,
}) {
  const { t } = useI18n();
  const catalog = useMemo(() => workspaceModels(apiModels), [apiModels]);
  const [modelId, setModelId] = useState('kling'),
    [mode, setMode] = useState('TEXT_TO_VIDEO'),
    [duration, setDuration] = useState(5),
    [quality, setQuality] = useState('standard'),
    [aspectRatio, setAspectRatio] = useState('16:9');
  const [menu, setMenu] = useState(false),
    [options, setOptions] = useState(false),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(''),
    [error, setError] = useState(''),
    [dragging, setDragging] = useState(false);
  const textarea = useRef(null),
    input = useRef(null),
    picker = useRef(null);
  const model = catalog.find((item) => item.id === modelId) || catalog[0],
    apiModel = model?.api,
    capabilities = apiModel?.modes?.[mode];
  const { quote, error: quoteError } = useGenerationPrice(
    capabilities
      ? {
          model: apiModel.id,
          mode,
          duration,
          quality,
          aspectRatio,
        }
      : null,
  );
  const configured = quote?.status === 'AVAILABLE';
  const cost = configured ? quote.credits : null;
  const insufficient = cost != null && !user.isAdmin && (user.generationCredits ?? 0) < cost;
  const locked = submitting || pendingRequest;
  const canSubmit =
    !loading &&
    !locked &&
    apiModel?.available &&
    quote?.canGenerate &&
    configured &&
    capabilities &&
    !insufficient;
  useEffect(() => {
    if (!capabilities) return;
    setDuration((value) =>
      capabilities.durations.includes(value) ? value : capabilities.durations[0],
    );
    setQuality((value) =>
      capabilities.qualities.includes(value) ? value : capabilities.qualities[0],
    );
    setAspectRatio((value) =>
      capabilities.aspectRatios.includes(value) ? value : capabilities.aspectRatios[0],
    );
  }, [capabilities]);
  useEffect(() => {
    const element = textarea.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${Math.min(150, Math.max(54, element.scrollHeight))}px`;
    }
  }, [prompt]);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!menu) return;
    const close = (event) => {
      if (
        event.key === 'Escape' ||
        (event.type === 'pointerdown' && !picker.current?.contains(event.target))
      )
        setMenu(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);
  function pickFile(selected) {
    if (!selected || locked) return;
    if (selected.type.startsWith('video/')) {
      setError('Входное видео пока не поддерживается API. Добавь изображение или используй текст.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Поддерживаются JPEG, PNG и WebP.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Максимальный размер изображения — 10 МБ.');
      return;
    }
    if (!apiModel?.modes?.IMAGE_TO_VIDEO) {
      setError('Эта модель пока не поддерживает загрузку изображений.');
      return;
    }
    setError('');
    setFile(selected);
    setMode('IMAGE_TO_VIDEO');
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!prompt.trim()) {
      setError('Опиши, что хочешь создать.');
      textarea.current?.focus();
      return;
    }
    if (!canSubmit) {
      setError(insufficient ? 'Недостаточно кредитов.' : 'Генерация этой моделью пока недоступна.');
      return;
    }
    if (mode === 'IMAGE_TO_VIDEO' && !file) {
      setError('Добавь исходное изображение.');
      return;
    }
    await onSubmit(
      {
        model: apiModel.id,
        prompt: prompt.trim(),
        mode,
        duration,
        quality,
        aspectRatio,
        priceConfirmation: quote.priceConfirmation,
      },
      mode === 'IMAGE_TO_VIDEO' ? file : null,
      source?.id,
    );
  }
  return (
    <form
      className={`wf-composer ${dragging ? 'is-dragging' : ''}`}
      onSubmit={submit}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pickFile(event.dataTransfer.files[0]);
      }}
      aria-label="Создание AI-контента"
    >
      {source && (
        <div className="wf-composer-source">
          <Sparkles size={13} />
          <span>{t('Продолжение идеи · связь с предыдущим узлом')}</span>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Убрать связь с предыдущим узлом')}
            onClick={onClearSource}
            disabled={locked}
          >
            <X size={14} />
          </button>
          <small>{t('Переносится промпт. Исходное видео не отправляется.')}</small>
        </div>
      )}
      {file && (
        <div className="wf-composer-attachment">
          <img src={preview} alt={t('Исходное изображение')} />
          <span>
            {file.name}
            <small>
              {t((file.size / 1024 / 1024).toFixed(1))}
              {t(' МБ · исходное фото')}
            </small>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Удалить изображение')}
            disabled={locked}
            onClick={() => {
              setFile(null);
              if (input.current) input.current.value = '';
              setMode('TEXT_TO_VIDEO');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <label className="sr-only" htmlFor="wf-prompt">
        {t('Промпт')}
      </label>
      <textarea
        id="wf-prompt"
        ref={textarea}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={t('Опиши, что хочешь создать...')}
        maxLength={2000}
        disabled={locked}
        rows={2}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.form.requestSubmit();
          }
        }}
      />
      <div className="wf-composer-toolbar">
        <div className="wf-model-picker" ref={picker}>
          <button
            type="button"
            className="wf-model-current"
            aria-expanded={menu}
            disabled={locked}
            onClick={() => setMenu(!menu)}
          >
            <span className="wf-model-mark">{t(model.mark)}</span>
            <span>
              {model.name}
              <small>
                {t(model.type)} · {priceLabel(quote, t)}
              </small>
            </span>
            <ChevronDown size={14} />
          </button>
          {menu && (
            <div className="wf-model-menu" role="group" aria-label={t('AI-модели')}>
              {catalog.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={modelId === item.id ? 'is-selected' : ''}
                  onClick={() => {
                    setModelId(item.id);
                    setMode('TEXT_TO_VIDEO');
                    setFile(null);
                    setMenu(false);
                    setError('');
                  }}
                >
                  <span className="wf-model-mark">{t(item.mark)}</span>
                  <span>
                    {item.name}
                    <small>{modelDescription(item, t)}</small>
                  </span>
                  <small>
                    {t(
                      item.api?.available
                        ? 'Доступна'
                        : item.api?.enabled
                          ? 'Не подключена'
                          : 'Скоро',
                    )}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="wf-composer-upload-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={t('Добавить изображение')}
            title={t('JPEG, PNG, WebP · до 10 МБ')}
            disabled={locked || !apiModel?.inputs?.image}
            onClick={() => input.current?.click()}
          >
            <ImagePlus size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Загрузка видео пока недоступна')}
            title={t('API пока не поддерживает входное видео')}
            disabled
          >
            <Video size={19} />
          </button>
        </div>
        <button
          type="button"
          className={`wf-composer-options-toggle ${options ? 'is-open' : ''}`}
          aria-expanded={options}
          onClick={() => setOptions(!options)}
        >
          {t('Параметры ')}
          <ChevronDown size={13} />
        </button>
        <button className="glass-button primary wf-create-button" disabled={!canSubmit}>
          {submitting ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
          <span>{t(submitting ? 'Отправляем…' : 'Создать')}</span>
          <small>
            <GenerationPrice quote={quote} />
          </small>
          <ArrowUpRight size={16} />
        </button>
      </div>
      {options && (
        <div className="wf-composer-options">
          <label>
            {t('Режим')}
            <select
              aria-label={t('Режим')}
              value={mode}
              disabled={locked || !apiModel?.modes?.TEXT_TO_VIDEO}
              onChange={(event) => setMode(event.target.value)}
            >
              {Object.keys(apiModel?.modes || {})
                .filter((key) => modeNames[key])
                .map((key) => (
                  <option key={key} value={key}>
                    {t(modeNames[key])}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {t('Длительность')}
            <select
              aria-label={t('Длительность')}
              value={duration}
              disabled={locked || !capabilities}
              onChange={(event) => setDuration(Number(event.target.value))}
            >
              {(capabilities?.durations || []).map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                  {t(' сек')}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Качество')}
            <select
              aria-label={t('Качество')}
              value={quality}
              disabled={locked || !capabilities}
              onChange={(event) => setQuality(event.target.value)}
            >
              {(capabilities?.qualities || []).map((value) => (
                <option key={value} value={value}>
                  {t(value === 'standard' ? 'Стандартное' : value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Формат')}
            <select
              aria-label={t('Формат')}
              value={aspectRatio}
              disabled={locked || !capabilities}
              onChange={(event) => setAspectRatio(event.target.value)}
            >
              {(capabilities?.aspectRatios || []).map((value) => (
                <option key={value} value={value}>
                  {t(value === 'source' ? 'По изображению' : value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        onChange={(event) => {
          pickFile(event.target.files[0]);
          event.target.value = '';
        }}
      />
      {pendingRequest && (
        <div className="wf-composer-pending" role="status">
          <span>{t('Ответ на предыдущий запрос не подтверждён.')}</span>
          <button type="button" className="text-button" disabled={submitting} onClick={onRetry}>
            <RotateCcw size={14} />
            {t('Повторить проверку')}
          </button>
        </div>
      )}
      {(error || modelError || quoteError) && (
        <p className="wf-composer-error" role="alert">
          {t(error || modelError || quoteError)}
        </p>
      )}
      {!modelError && !apiModel?.available && (
        <p className="wf-composer-note">
          {t(
            model.provider
              ? 'Higgsfield — провайдер. Для генерации выбери Kling или Seedance.'
              : apiModel?.enabled
                ? 'Сервис генерации пока не подключён. Твой промпт можно подготовить заранее.'
                : 'Эта модель появится позже. Генерация пока недоступна.',
          )}
        </p>
      )}
      {insufficient && (
        <p className="wf-composer-note">{t('Недостаточно кредитов для этой генерации.')}</p>
      )}
      <div className="wf-composer-footnote">
        <span>
          {t(
            user.isAdmin
              ? 'Администратор · без списания кредитов'
              : `Доступно ${user.generationCredits ?? 0} кредитов`,
          )}
        </span>
        <span>{t(prompt.length)} / 2000 · Ctrl + Enter</span>
      </div>
    </form>
  );
}
