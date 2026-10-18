import { useI18n } from '../../i18n/index';
import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Pencil, Video, X } from 'lucide-react';
import { apiUrl } from '../../services/api';
import { loadWorkflowAsset } from '../../services/workflow-assets';
import { modeLabels, modelOptions } from '../../services/workflow-options';
import ModelIdentity from './ModelIdentity';
import useGenerationPrice from '../../hooks/useGenerationPrice';
import GenerationPrice from '../Pricing/GenerationPrice';

function ModelPrice({ body }) {
  const { quote } = useGenerationPrice(body);
  return (
    <small className="wf-editor-field-wide" aria-live="polite">
      <GenerationPrice quote={quote} />
    </small>
  );
}

function NodeMedia({ node }) {
  const { t } = useI18n();
  const [src, setSrc] = useState(''),
    [error, setError] = useState('');
  const media = useRef(null);
  useEffect(() => {
    let cancelled = false,
      objectUrl;
    setSrc('');
    setError('');
    loadWorkflowAsset(node.data.assetId)
      .then((record) => {
        if (cancelled) return;
        if (record?.blob) {
          objectUrl = URL.createObjectURL(record.blob);
          setSrc(objectUrl);
        } else if (node.data.uploadId) setSrc(apiUrl(`/uploads/${node.data.uploadId}`));
        else setError('Файл недоступен на этом устройстве.');
      })
      .catch(() => {
        if (cancelled) return;
        if (node.data.uploadId) setSrc(apiUrl(`/uploads/${node.data.uploadId}`));
        else setError('Не удалось открыть файл.');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [node.data.assetId, node.data.uploadId]);
  useEffect(() => {
    const video = media.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) video.pause();
    });
    observer.observe(video);
    const pauseHidden = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => {
      video.pause();
      observer.disconnect();
      document.removeEventListener('visibilitychange', pauseHidden);
    };
  }, [src]);
  if (error) return <p className="wf-editor-note">{t(error)}</p>;
  if (!src) return <div className="wf-editor-media-placeholder">{t('Загрузка превью…')}</div>;
  return node.type === 'image' ? (
    <img
      className="wf-editor-media"
      src={src}
      alt={node.data.fileName}
      draggable="false"
      onError={() => setError('Не удалось открыть изображение.')}
    />
  ) : (
    <video
      ref={media}
      className="wf-editor-media"
      src={src}
      controls
      playsInline
      preload="metadata"
      onError={() => setError('Браузер не поддерживает это видео.')}
    />
  );
}

function ModelControls({ node, model, onChange }) {
  const { t } = useI18n();
  if (!model) return <p className="wf-editor-note">{t('Модель недоступна в текущем каталоге.')}</p>;
  const configuration = node.configuration;
  const mode = model.modes[configuration.mode] ? configuration.mode : Object.keys(model.modes)[0];
  const caps = model.modes[mode];
  const options = modelOptions(caps, configuration);
  const change = (update) => onChange(node.id, { configuration: { ...options, mode, ...update } });
  return (
    <div className="wf-editor-model-controls" data-canvas-interactive>
      <ModelPrice body={{ model: model.id, mode, ...options }} />
      <label className="wf-editor-field wf-editor-field-wide">
        {t('Режим')}
        <select
          aria-label={t('Режим модели')}
          value={mode}
          onChange={(event) =>
            onChange(node.id, {
              configuration: {
                mode: event.target.value,
                ...modelOptions(model.modes[event.target.value], configuration),
              },
            })
          }
        >
          {Object.keys(model.modes).map((key) => (
            <option key={key} value={key}>
              {t(modeLabels[key] || key)}
            </option>
          ))}
        </select>
      </label>
      {[
        ['duration', caps?.durations, 'Длительность'],
        ['quality', caps?.qualities, 'Качество'],
        ['aspectRatio', caps?.aspectRatios, 'Формат'],
      ]
        .filter(([, values]) => values?.length)
        .map(([key, values, label]) => (
          <label className="wf-editor-field" key={key}>
            {t(label)}
            <select
              aria-label={t(label)}
              value={options[key]}
              onChange={(event) =>
                change({
                  [key]: key === 'duration' ? Number(event.target.value) : event.target.value,
                })
              }
            >
              {values.map((value) => (
                <option key={value} value={value}>
                  {t(
                    key === 'duration'
                      ? `${value} сек`
                      : value === 'source'
                        ? 'По изображению'
                        : value,
                  )}
                </option>
              ))}
            </select>
          </label>
        ))}
      {Object.entries(caps?.parameters || {}).map(([key, rule]) => (
        <label className="wf-editor-field" key={key}>
          {t(rule.label)}
          <select
            aria-label={t(rule.label)}
            value={String(options.parameters[key])}
            onChange={(event) =>
              change({
                parameters: {
                  ...options.parameters,
                  [key]:
                    rule.type === 'boolean' ? event.target.value === 'true' : event.target.value,
                },
              })
            }
          >
            {(rule.type === 'boolean' ? [true, false] : rule.values).map((value) => (
              <option key={String(value)} value={String(value)}>
                {t(typeof value === 'boolean' ? (value ? 'Включён' : 'Выключен') : value)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export default function WorkflowNode({
  node,
  model,
  selected,
  onSelect,
  onMove,
  onChange,
  onDelete,
  onRetryUpload,
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(node.data.text || '');
  function finishEditing() {
    if (!draft.trim()) return;
    onChange(node.id, { data: { ...node.data, text: draft.trim() } });
    setEditing(false);
  }
  const title =
    node.type === 'model'
      ? model?.name || node.data.name
      : { prompt: 'Prompt', image: 'Image', video: 'Video', audio: 'Audio' }[node.type];
  const Icon = node.type === 'image' ? ImageIcon : node.type === 'video' ? Video : FileText;
  return (
    <article
      className={`wf-editor-node wf-editor-node-${node.type} ${selected ? 'is-selected' : ''}`}
      data-editor-node={node.id}
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
      onClick={() => onSelect(node.id)}
    >
      <div
        className="wf-editor-node-heading"
        data-node-handle={node.id}
        role="button"
        tabIndex={0}
        aria-label={t('Переместить узел {{v0}}', { v0: t(title) })}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const offset = {
            ArrowLeft: [-20, 0],
            ArrowRight: [20, 0],
            ArrowUp: [0, -20],
            ArrowDown: [0, 20],
          }[event.key];
          if (offset) {
            event.preventDefault();
            onMove(node.id, { x: node.position.x + offset[0], y: node.position.y + offset[1] });
          }
        }}
      >
        <span>
          {node.type === 'model' ? (
            <ModelIdentity model={model || { id: node.data.modelId, name: node.data.name }} />
          ) : (
            <Icon size={15} />
          )}
          <strong>{t(title)}</strong>
        </span>
        <div className="wf-editor-node-actions">
          {node.type === 'prompt' && (
            <button
              type="button"
              className="icon-button"
              aria-label={t(editing ? 'Готово' : 'Редактировать промпт')}
              disabled={editing && !draft.trim()}
              onClick={() => {
                if (editing) finishEditing();
                else {
                  setDraft(node.data.text);
                  setEditing(true);
                }
              }}
            >
              {editing ? <Check size={14} /> : <Pencil size={13} />}
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label={t('Удалить узел {{v0}}', { v0: t(title) })}
            onClick={() => onDelete(node.id)}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {node.type === 'prompt' && (
        <div className="wf-editor-prompt" data-canvas-interactive>
          {editing ? (
            <textarea
              autoFocus
              aria-label={t('Текст Prompt Node')}
              value={draft}
              maxLength={2000}
              rows={5}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                if (draft.trim()) onChange(node.id, { data: { ...node.data, text: draft.trim() } });
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') finishEditing();
                if (event.key === 'Escape') {
                  setDraft(node.data.text);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <p>{node.data.text}</p>
          )}
        </div>
      )}
      {['image', 'video'].includes(node.type) && (
        <>
          <NodeMedia node={node} />
          <div className="wf-editor-file-meta">
            <span title={node.data.fileName}>{node.data.fileName}</span>
            <small>
              {t((node.data.size / 1024 / 1024).toFixed(1))}
              {t(' МБ')}
            </small>
          </div>
          {node.data.uploadError && (
            <div className="wf-editor-upload-error" data-canvas-interactive>
              <p>{t(node.data.uploadError)}</p>
              <button type="button" onClick={() => onRetryUpload(node)}>
                {t('Повторить загрузку')}
              </button>
            </div>
          )}
        </>
      )}
      {node.type === 'model' && <ModelControls node={node} model={model} onChange={onChange} />}
    </article>
  );
}
