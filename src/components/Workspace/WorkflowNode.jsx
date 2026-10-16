import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Pencil, Video, X } from 'lucide-react';
import { apiUrl } from '../../services/api';
import { loadWorkflowAsset } from '../../services/workflow-assets';
import { modeLabels, modelOptions } from '../../services/workflow-options';
import ModelIdentity from './ModelIdentity';

function NodeMedia({ node }) {
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
  if (error) return <p className="wf-editor-note">{error}</p>;
  if (!src) return <div className="wf-editor-media-placeholder">Загрузка превью…</div>;
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
  if (!model) return <p className="wf-editor-note">Модель недоступна в текущем каталоге.</p>;
  const configuration = node.configuration;
  const mode = model.modes[configuration.mode] ? configuration.mode : Object.keys(model.modes)[0];
  const caps = model.modes[mode];
  const options = modelOptions(caps, configuration);
  const change = (update) => onChange(node.id, { configuration: { ...options, mode, ...update } });
  return (
    <div className="wf-editor-model-controls" data-canvas-interactive>
      <label className="wf-editor-field wf-editor-field-wide">
        Режим
        <select
          aria-label="Режим модели"
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
              {modeLabels[key] || key}
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
            {label}
            <select
              aria-label={label}
              value={options[key]}
              onChange={(event) =>
                change({
                  [key]: key === 'duration' ? Number(event.target.value) : event.target.value,
                })
              }
            >
              {values.map((value) => (
                <option key={value} value={value}>
                  {key === 'duration'
                    ? `${value} сек`
                    : value === 'source'
                      ? 'По изображению'
                      : value}
                </option>
              ))}
            </select>
          </label>
        ))}
      {Object.entries(caps?.parameters || {}).map(([key, rule]) => (
        <label className="wf-editor-field" key={key}>
          {rule.label}
          <select
            aria-label={rule.label}
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
                {typeof value === 'boolean' ? (value ? 'Включён' : 'Выключен') : value}
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
        aria-label={`Переместить узел ${title}`}
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
          <strong>{title}</strong>
        </span>
        <div className="wf-editor-node-actions">
          {node.type === 'prompt' && (
            <button
              type="button"
              className="icon-button"
              aria-label={editing ? 'Готово' : 'Редактировать промпт'}
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
            aria-label={`Удалить узел ${title}`}
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
              aria-label="Текст Prompt Node"
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
            <small>{(node.data.size / 1024 / 1024).toFixed(1)} МБ</small>
          </div>
          {node.data.uploadError && (
            <div className="wf-editor-upload-error" data-canvas-interactive>
              <p>{node.data.uploadError}</p>
              <button type="button" onClick={() => onRetryUpload(node)}>
                Повторить загрузку
              </button>
            </div>
          )}
        </>
      )}
      {node.type === 'model' && <ModelControls node={node} model={model} onChange={onChange} />}
    </article>
  );
}
