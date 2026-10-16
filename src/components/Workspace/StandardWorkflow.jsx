import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ImagePlus, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import useWorkflowGenerations from '../../hooks/useWorkflowGenerations';
import {
  compatibleModels,
  modeLabels,
  modelOptions,
  validateReferenceFiles,
} from '../../services/workflow-options';

export default function StandardWorkflow({ user, refresh, models, modelError, modelsLoading }) {
  const [type, setType] = useState('Image'),
    [mode, setMode] = useState('TEXT_TO_IMAGE');
  const [modelId, setModelId] = useState(''),
    [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState({ parameters: {} }),
    [attachments, setAttachments] = useState({});
  const [quote, setQuote] = useState(null),
    [quoteError, setQuoteError] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [uploading, setUploading] = useState(false);
  const busy = useRef(false);
  const generation = useWorkflowGenerations(user.id, refresh, 'standard');
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
  const estimateBody = model ? { model: model.id, mode, ...normalized } : null;
  const quoteKey = JSON.stringify(estimateBody);
  const currentQuote = quote?.key === quoteKey ? quote : null;
  const locked = uploading || generation.submitting || generation.pendingRequest;
  useEffect(() => {
    if (!modes.includes(mode) && modes.length) setMode(modes[0]);
  }, [modes.join(','), mode]);
  useEffect(() => {
    setQuoteError('');
    setQuote(null);
    if (!model) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api('/generations/estimate', {
        method: 'POST',
        body: JSON.parse(quoteKey),
        signal: controller.signal,
      })
        .then((value) => {
          if (!controller.signal.aborted) setQuote({ ...value, key: quoteKey });
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setQuoteError(err.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteKey, user.generationCredits, user.isAdmin]);

  function updateSelection(change) {
    if (locked) return;
    change();
    setError('');
    setNotice('');
  }
  function pickFiles(rule, selected) {
    const files = [...selected];
    const message = validateReferenceFiles(rule, files);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setAttachments((current) => ({
      ...current,
      [`${model.id}:${mode}:${rule.role}`]: files.map((file) => ({
        file,
        id: crypto.randomUUID(),
      })),
    }));
  }
  const canGenerate =
    !modelsLoading &&
    !locked &&
    model?.available &&
    currentQuote?.status === 'configured' &&
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
      });
      if (result) setNotice('Запрос принят. Статус доступен в библиотеке.');
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setUploading(false);
    }
  }
  return (
    <div className="wf-standard">
      <form className="wf-generation-panel" onSubmit={submit} aria-label="Standard generation">
        <div className="wf-standard-intro">
          <span className="wf-standard-eyebrow">GENERATION PANEL</span>
          <h2>Начни с идеи</h2>
          <p>Опиши свой замысел и выбери модель.</p>
        </div>
        <div className="wf-type-switch" role="group" aria-label="Тип генерации">
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
              {value}
            </button>
          ))}
        </div>
        <label className="wf-standard-label">
          Промпт
          <textarea
            aria-label="Промпт Standard"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={2000}
            rows={7}
            placeholder="Опиши, что хочешь создать…"
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
            Режим
            <select
              aria-label="Режим Standard"
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
                  {modeLabels[key] || key}
                </option>
              ))}
            </select>
          </label>
          <label className="wf-standard-label">
            AI-модель
            <select
              aria-label="AI-модель Standard"
              value={model?.id || ''}
              disabled={locked || !available.length}
              onChange={(event) => updateSelection(() => setModelId(event.target.value))}
            >
              {!available.length && <option value="">Нет совместимых моделей</option>}
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
                {rule.label}
                <span className="wf-reference-hint">
                  {rule.min === rule.max ? rule.max : `${rule.min}–${rule.max}`} ·{' '}
                  {rule.type === 'video' ? 'MP4' : 'JPEG, PNG, WebP'} · до{' '}
                  {rule.maxBytes / 1024 / 1024} МБ
                </span>
                <span className="wf-reference-input">
                  <ImagePlus size={16} />
                  {entries.length ? 'Заменить файлы' : 'Прикрепить файл'}
                  <input
                    type="file"
                    aria-label={rule.label}
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
                    aria-label={`Убрать ${entry.file.name}`}
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
                {label}
                <select
                  aria-label={label}
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
                      {key === 'duration'
                        ? `${value} сек`
                        : value === 'source'
                          ? 'По изображению'
                          : value === 'standard'
                            ? 'Стандартное'
                            : value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          {Object.entries(caps?.parameters || {}).map(([key, rule]) => (
            <label className="wf-standard-label" key={key}>
              {rule.label}
              {rule.type === 'boolean' ? (
                <select
                  aria-label={rule.label}
                  value={String(normalized.parameters[key])}
                  disabled={locked}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      parameters: { ...current.parameters, [key]: event.target.value === 'true' },
                    }))
                  }
                >
                  <option value="true">Включён</option>
                  <option value="false">Выключен</option>
                </select>
              ) : (
                <select
                  aria-label={rule.label}
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
                      {value}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
        <div className="wf-standard-submit">
          <div className="wf-standard-cost">
            <span>Стоимость генерации</span>
            <strong>
              {currentQuote?.status === 'configured'
                ? `${currentQuote.credits} кр.`
                : currentQuote?.status === 'unconfigured'
                  ? 'Не настроена'
                  : '—'}
            </strong>
          </div>
          <button className="glass-button primary wf-standard-generate" disabled={!canGenerate}>
            <Sparkles size={16} />
            <span>{uploading || generation.submitting ? 'Отправляем…' : 'Generate'}</span>
            <ArrowUpRight size={16} />
          </button>
          {currentQuote?.status === 'unconfigured' && (
            <p className="wf-composer-note">Генерация станет доступна после настройки стоимости.</p>
          )}
          {model && !model.available && (
            <p className="wf-composer-note">Сервис генерации пока не подключён.</p>
          )}
          {currentQuote?.status === 'configured' && !currentQuote.sufficientBalance && (
            <p className="wf-composer-note">Недостаточно кредитов.</p>
          )}
          {generation.pendingRequest && (
            <div className="wf-composer-pending" role="status">
              <span>Ответ не подтверждён.</span>
              <button
                type="button"
                className="text-button"
                disabled={generation.submitting}
                onClick={async () => {
                  const result = await generation.retry();
                  if (result) setNotice('Запрос подтверждён.');
                }}
              >
                Повторить проверку
              </button>
            </div>
          )}
          {(error || modelError || quoteError || generation.error) && (
            <p className="wf-composer-error" role="alert">
              {error || modelError || quoteError || generation.error}
            </p>
          )}
          {notice && (
            <p className="wf-composer-note" role="status">
              {notice}
            </p>
          )}
          <small className="wf-standard-balance">
            {user.isAdmin
              ? 'Администратор · без списания кредитов'
              : `Доступно ${user.generationCredits ?? 0} кредитов`}
          </small>
        </div>
      </form>
      <div className="wf-generation-workspace" aria-label="Generation Workspace">
        <span>Здесь появятся твои идеи</span>
      </div>
    </div>
  );
}
