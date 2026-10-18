import { useI18n } from '../../i18n/index';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ImagePlus, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import { priceLabel, generationPriceLabel } from '../../services/pricing';
import useGenerationPrice from '../../hooks/useGenerationPrice';
import GenerationPrice from '../Pricing/GenerationPrice';
import MediaPreview from './MediaPreview';
import MaterialDialog from './MaterialDialog';
import GenerationPending, { FrameTracing, isGenerationActive } from './GenerationPending';
import { generationLabels } from './InteractiveCanvas';
import {
  compatibleModels,
  modeLabels,
  modelOptions,
  validateReferenceFiles,
} from '../../services/workflow-options';

export default function StandardWorkflow({
  user,
  generations: generation,
  models,
  modelError,
  modelsLoading,
}) {
  const { t } = useI18n();
  const [type, setType] = useState('Image'),
    [mode, setMode] = useState('TEXT_TO_IMAGE');
  const [modelId, setModelId] = useState(''),
    [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState({ parameters: {} }),
    [attachments, setAttachments] = useState({});
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [uploading, setUploading] = useState(false);
  const busy = useRef(false);
  const [material, setMaterial] = useState(null);
  const [mobileScreen, setMobileScreen] = useState('create');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const resultsId = useId();
  const resultButton = useRef(null),
    backButton = useRef(null),
    navigationRequested = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!isMobile || !navigationRequested.current) return;
    navigationRequested.current = false;
    const target = mobileScreen === 'results' ? backButton.current : resultButton.current;
    target?.focus({ preventScroll: true });
  }, [mobileScreen, isMobile]);
  function navigateMobile(screen) {
    navigationRequested.current = true;
    document.activeElement?.blur();
    setMobileScreen(screen);
  }
  const modes = [
    ...new Set(
      models
        .filter((model) => model.enabled && model.generationType === type)
        .flatMap((model) => Object.keys(model.modes)),
    ),
  ];
  const available = compatibleModels(models, type, mode);
  const model = available.find((item) => item.id === modelId) || available[0];
  const caps = model?.modes[mode];
  const normalized = useMemo(() => modelOptions(caps, options), [caps, options]);
  const videoReferences = (caps?.references || [])
    .filter((rule) => rule.type === 'video')
    .flatMap((rule) =>
      (attachments[`${model.id}:${mode}:${rule.role}`] || [])
        .filter((entry) => entry.uploadId)
        .map((entry) => ({ role: rule.role, uploadId: entry.uploadId })),
    );
  const estimateBody = model
    ? {
        model: model.id,
        mode,
        ...normalized,
        ...(videoReferences.length ? { references: videoReferences } : {}),
      }
    : null;
  const { quote: currentQuote, error: quoteError } = useGenerationPrice(estimateBody);
  const locked = uploading || generation.submitting || generation.pendingRequest;
  useEffect(() => {
    if (!modes.includes(mode) && modes.length) setMode(modes[0]);
  }, [modes.join(','), mode]);

  function updateSelection(change) {
    if (locked) return;
    change();
    setError('');
    setNotice('');
  }
  async function pickFiles(rule, selected) {
    const files = [...selected];
    const message = validateReferenceFiles(rule, files);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    const key = `${model.id}:${mode}:${rule.role}`;
    const entries = files.map((file) => ({ file, id: crypto.randomUUID() }));
    setAttachments((current) => ({
      ...current,
      [key]: entries,
    }));
    if (rule.type !== 'video') return;
    // Upload video before quoting so billing uses server-inspected duration.
    setUploading(true);
    try {
      for (const entry of entries) {
        const form = new FormData();
        form.append('file', entry.file);
        const { image } = await api('/uploads/references', { method: 'POST', body: form });
        setAttachments((current) => ({
          ...current,
          [key]: (current[key] || []).map((item) =>
            item.id === entry.id ? { ...item, uploadId: image.id } : item,
          ),
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }
  const canGenerate =
    !modelsLoading &&
    !locked &&
    model?.available &&
    currentQuote?.canGenerate &&
    currentQuote.status === 'AVAILABLE' &&
    currentQuote.sufficientBalance;
  async function submit(event) {
    event.preventDefault();
    if (busy.current || !canGenerate) return;
    if (prompt.trim().length < (caps.promptMin || 1)) {
      setError('Напишите промпт для генерации.');
      return;
    }
    const references = [];
    for (const rule of caps.references || []) {
      const entries = attachments[`${model.id}:${mode}:${rule.role}`] || [];
      if (entries.length < rule.min) {
        setError(`Добавьте референс: ${rule.label}.`);
        return;
      }
    }
    busy.current = true;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      for (const rule of caps.references || []) {
        const key = `${model.id}:${mode}:${rule.role}`;
        for (const entry of attachments[key] || []) {
          let uploadId = entry.uploadId;
          if (!uploadId) {
            const form = new FormData();
            form.append('file', entry.file);
            const { image } = await api('/uploads/references', { method: 'POST', body: form });
            uploadId = image.id;
            setAttachments((current) => ({
              ...current,
              [key]: current[key].map((item) =>
                item.id === entry.id ? { ...item, uploadId } : item,
              ),
            }));
          }
          references.push({ role: rule.role, uploadId });
        }
      }
      const result = await generation.submit({
        ...estimateBody,
        prompt: prompt.trim(),
        references,
        priceConfirmation: currentQuote.priceConfirmation,
      });
      if (result) setNotice('Запрос принят. Результат появится в рабочей области.');
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setUploading(false);
    }
  }
  return (
    <div className="wf-standard-viewport" data-mobile-screen={mobileScreen}>
      <div className="wf-standard">
        <form
          className="wf-generation-panel"
          onSubmit={submit}
          aria-label={t('Standard generation')}
          inert={isMobile && mobileScreen === 'results'}
          aria-hidden={isMobile && mobileScreen === 'results' ? true : undefined}
        >
          <div className="wf-standard-intro">
            <span className="wf-standard-eyebrow">{t('GENERATION PANEL')}</span>
            <h2>{t('Опиши свой замысел и выбери модель')}</h2>
          </div>
          <div className="wf-type-switch" role="group" aria-label={t('Тип генерации')}>
            {['Image', 'Video'].map((value) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                aria-pressed={type === value}
                onClick={() =>
                  updateSelection(() => {
                    setType(value);
                    setMode(value === 'Image' ? 'TEXT_TO_IMAGE' : 'TEXT_TO_VIDEO');
                    setModelId('');
                  })
                }
              >
                {t(value)}
              </button>
            ))}
          </div>
          <label className="wf-standard-label">
            {t('Промпт')}
            <textarea
              aria-label={t('Промпт Standard')}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={2000}
              rows={7}
              placeholder={t('Опиши, что хочешь создать…')}
              disabled={locked}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.form.requestSubmit();
                }
              }}
            />
          </label>
          <div className="wf-standard-fields">
            <label className="wf-standard-label">
              {t('Режим')}
              <select
                aria-label={t('Режим Standard')}
                value={mode}
                disabled={locked || !modes.length}
                onChange={(event) =>
                  updateSelection(() => {
                    setMode(event.target.value);
                    setModelId('');
                  })
                }
              >
                {modes.map((key) => (
                  <option key={key} value={key}>
                    {t(modeLabels[key] || key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="wf-standard-label">
              {t('AI-модель')}
              <select
                aria-label={t('AI-модель Standard')}
                value={model?.id || ''}
                disabled={locked || !available.length}
                onChange={(event) => updateSelection(() => setModelId(event.target.value))}
              >
                {!available.length && <option value="">{t('Нет совместимых моделей')}</option>}
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {priceLabel(item.pricing, t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(caps?.references || []).map((rule) => {
            const key = `${model.id}:${mode}:${rule.role}`,
              entries = attachments[key] || [];
            return (
              <div className="wf-standard-reference" key={key}>
                <label className="wf-standard-label">
                  {t(rule.label)}
                  <span className="wf-reference-hint">
                    {t(rule.min === rule.max ? rule.max : `${rule.min}–${rule.max}`)} ·{' '}
                    {t(rule.type === 'video' ? 'MP4' : 'JPEG, PNG, WebP')}
                    {t(' · до')} {t(rule.maxBytes / 1024 / 1024)}
                    {t(' МБ')}
                  </span>
                  <span className="wf-reference-input">
                    <ImagePlus size={16} />
                    {t(entries.length ? 'Заменить файлы' : 'Прикрепить файл')}
                    <input
                      type="file"
                      aria-label={t(rule.label)}
                      accept={rule.mimeTypes.join(',')}
                      multiple={rule.max > 1}
                      disabled={locked}
                      onChange={(event) => {
                        if (event.target.files.length) pickFiles(rule, event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </span>
                </label>
                {entries.map((entry) => (
                  <div className="wf-reference-file" key={entry.id}>
                    <span>{entry.file.name}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t('Убрать {{v0}}', { v0: entry.file.name })}
                      disabled={locked}
                      onClick={() =>
                        setAttachments((current) => ({
                          ...current,
                          [key]: current[key].filter((item) => item.id !== entry.id),
                        }))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="wf-standard-options">
            {[
              ['duration', caps?.durations, 'Длительность'],
              ['quality', caps?.qualities, 'Разрешение / качество'],
              ['aspectRatio', caps?.aspectRatios, 'Формат'],
            ]
              .filter(([, values]) => values?.length)
              .map(([key, values, label]) => (
                <label className="wf-standard-label" key={key}>
                  {t(label)}
                  <select
                    aria-label={t(label)}
                    value={normalized[key]}
                    disabled={locked}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        [key]: key === 'duration' ? Number(event.target.value) : event.target.value,
                      }))
                    }
                  >
                    {values.map((value) => (
                      <option key={value} value={value}>
                        {t(
                          key === 'duration'
                            ? `${value} сек`
                            : value === 'source'
                              ? 'По изображению'
                              : value === 'standard'
                                ? 'Стандартное'
                                : value,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            {Object.entries(caps?.parameters || {}).map(([key, rule]) => (
              <label className="wf-standard-label" key={key}>
                {t(rule.label)}
                {rule.type === 'boolean' ? (
                  <select
                    aria-label={t(rule.label)}
                    value={String(normalized.parameters[key])}
                    disabled={locked}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        parameters: { ...current.parameters, [key]: event.target.value === 'true' },
                      }))
                    }
                  >
                    <option value="true">{t('Включён')}</option>
                    <option value="false">{t('Выключен')}</option>
                  </select>
                ) : (
                  <select
                    aria-label={t(rule.label)}
                    value={normalized.parameters[key]}
                    disabled={locked}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        parameters: { ...current.parameters, [key]: event.target.value },
                      }))
                    }
                  >
                    {rule.values.map((value) => (
                      <option key={value} value={value}>
                        {t(value)}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
          <div className="wf-standard-submit">
            <div className="wf-standard-cost">
              <span>{t('Стоимость генерации')}</span>
              <strong>
                <GenerationPrice quote={currentQuote} />
              </strong>
            </div>
            <div className="wf-standard-actions">
              <button className="glass-button primary wf-standard-generate" disabled={!canGenerate}>
                <Sparkles size={16} />
                <span>{t(uploading || generation.submitting ? 'Отправляем…' : 'Generate')}</span>
                <ArrowUpRight size={16} />
              </button>
              <button
                ref={resultButton}
                type="button"
                className="glass-button wf-standard-result"
                aria-controls={resultsId}
                onClick={() => navigateMobile('results')}
              >
                <FrameTracing />
                <span>{t('Result')}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
            {currentQuote?.status === 'PRICE_UNAVAILABLE' && (
              <p className="wf-composer-note">
                {t('Генерация станет доступна после настройки стоимости.')}
              </p>
            )}
            {model && !model.available && (
              <p className="wf-composer-note">{t('Сервис генерации пока не подключён.')}</p>
            )}
            {currentQuote && !currentQuote.storageAvailable && (
              <p className="wf-composer-note">{t('Хранилище результатов R2 не подключено.')}</p>
            )}
            {currentQuote?.status === 'AVAILABLE' && !currentQuote.sufficientBalance && (
              <p className="wf-composer-note">{t('Недостаточно кредитов.')}</p>
            )}
            {generation.pendingRequest && (
              <div className="wf-composer-pending" role="status">
                <span>{t('Ответ не подтверждён.')}</span>
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    generation.submitting ||
                    (generation.priceChanged && !currentQuote?.priceConfirmation)
                  }
                  onClick={async () => {
                    const result = await generation.retry(currentQuote?.priceConfirmation);
                    if (result) setNotice('Запрос подтверждён.');
                  }}
                >
                  {t(generation.priceChanged ? 'Подтвердить новую цену' : 'Повторить проверку')}
                </button>
              </div>
            )}
            {(error || modelError || quoteError || generation.error) && (
              <p className="wf-composer-error" role="alert">
                {t(error || modelError || quoteError || generation.error)}
              </p>
            )}
            {notice && (
              <p className="wf-composer-note" role="status">
                {t(notice)}
              </p>
            )}
            <small className="wf-standard-balance">
              {t(
                user.isAdmin
                  ? 'ADMIN · внутренние кредиты не списываются. Запрос оплачивается в Higgsfield.'
                  : `Доступно ${user.generationCredits ?? 0} кредитов`,
              )}
            </small>
          </div>
        </form>
        <div
          id={resultsId}
          className="wf-standard-results"
          aria-label={t('Generation Workspace')}
          inert={isMobile && mobileScreen === 'create'}
          aria-hidden={isMobile && mobileScreen === 'create' ? true : undefined}
        >
          <div className="wf-generation-workspace wf-generation-results">
            {generation.loading && <p role="status">{t('Загружаем историю…')}</p>}
            {!generation.loading && !generation.items.length && (
              <span>{t('Здесь появятся твои идеи')}</span>
            )}
            {generation.items
              .slice()
              .reverse()
              .map((item) => (
                <article
                  className="wf-generation-result"
                  key={item.id}
                  aria-busy={isGenerationActive(item.status)}
                >
                  {isGenerationActive(item.status) && <FrameTracing />}
                  <div className="wf-generation-result-meta">
                    <strong>
                      {models.find((entry) => entry.id === item.model)?.name || item.model}
                    </strong>
                    <span role="status">{t(generationLabels[item.status] || item.status)}</span>
                  </div>
                  {isGenerationActive(item.status) && <GenerationPending />}
                  {item.status === 'completed' &&
                    (item.resultVideoUrl || item.resultImageUrls?.length > 0) &&
                    (item.resultImageUrls?.length ? (
                      item.resultImageUrls.map((url, index) => (
                        <MediaPreview
                          key={index}
                          item={{ ...item, resultImageUrl: url }}
                          onOpen={setMaterial}
                        />
                      ))
                    ) : (
                      <MediaPreview item={item} onOpen={setMaterial} />
                    ))}
                  <p className="wf-generation-result-prompt">{item.prompt}</p>
                  <small>{generationPriceLabel(item, t)}</small>
                  {item.errorMessage && (
                    <p className="wf-composer-error" role="alert">
                      {t(item.errorMessage)}
                    </p>
                  )}
                  {item.requiresReview && (
                    <p className="wf-composer-note">
                      {t('Проверьте задачу в Higgsfield перед новым запуском.')}
                    </p>
                  )}
                </article>
              ))}
          </div>
          <button
            ref={backButton}
            type="button"
            className="wf-standard-back"
            aria-label={t('Вернуться к созданию')}
            onClick={() => navigateMobile('create')}
          >
            <ArrowLeft size={18} strokeWidth={1.25} aria-hidden="true" />
          </button>
        </div>
      </div>
      <MaterialDialog
        key={material?.id || 'closed'}
        item={material}
        onClose={() => setMaterial(null)}
      />
    </div>
  );
}
