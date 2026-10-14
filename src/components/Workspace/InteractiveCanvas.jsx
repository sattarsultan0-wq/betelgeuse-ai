import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  Download,
  Film,
  Focus,
  LoaderCircle,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import { downloadVideo } from '../../services/api';
import MediaPreview from './MediaPreview';

export const generationLabels = {
  uploading: 'Загружаем изображение',
  queued: 'В очереди',
  processing: 'Создаётся',
  completed: 'Готово',
  failed: 'Ошибка',
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nodePosition = (index) => ({
  x: 60 + (index % 3) * 340,
  y: 65 + Math.floor(index / 3) * 335,
});

function GenerationNode({ item, position, selected, onSelect, onDerive, onOpen, onMove }) {
  const [downloadError, setDownloadError] = useState(''),
    [downloading, setDownloading] = useState(false);
  const active = ['queued', 'processing', 'uploading'].includes(item.status);
  return (
    <article
      className={`wf-node ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onClick={() => onSelect(item.id)}
    >
      <div
        className="wf-node-handle"
        data-node-handle={item.id}
        tabIndex={0}
        role="button"
        aria-label={`Переместить узел: ${item.prompt}. Используй стрелки.`}
        onKeyDown={(event) => {
          const directions = {
            ArrowLeft: [-20, 0],
            ArrowRight: [20, 0],
            ArrowUp: [0, -20],
            ArrowDown: [0, 20],
          };
          if (directions[event.key]) {
            event.preventDefault();
            const [x, y] = directions[event.key];
            onMove(item.id, { x: position.x + x, y: position.y + y });
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(item.id);
          }
        }}
      >
        <span>
          <Film size={14} />
          {item.model === 'higgsfield'
            ? 'Seedance'
            : item.model === 'kling'
              ? 'Kling AI'
              : item.model}
        </span>
        <small className={`wf-node-status wf-node-status-${item.status}`}>
          {active && <LoaderCircle size={11} className="spin" />}
          {generationLabels[item.status] || item.status}
        </small>
      </div>
      {item.status === 'completed' && (item.resultVideoUrl || item.resultImageUrl) ? (
        <MediaPreview item={item} onOpen={onOpen} />
      ) : (
        <div className="wf-node-waiting">
          {active ? (
            <>
              <div className="wf-node-loader">
                <Sparkles size={25} />
              </div>
              <p>Дай идее немного времени</p>
            </>
          ) : item.status === 'failed' ? (
            <>
              <AlertCircle size={26} />
              <p>Генерация не завершена</p>
            </>
          ) : (
            <>
              <Film size={26} />
              <p>Материал ещё не доступен</p>
            </>
          )}
        </div>
      )}
      <p className="wf-node-prompt">{item.prompt}</p>
      <div className="wf-node-meta">
        <span>
          {item.duration ? `${item.duration} сек` : 'Image'} ·{' '}
          {item.aspectRatio === 'source' ? 'По изображению' : item.aspectRatio}
        </span>
        <span>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
      </div>
      {(item.errorMessage || downloadError) && (
        <p className="wf-node-error" role="alert">
          {downloadError || item.errorMessage}
        </p>
      )}
      {item.requiresReview && (
        <p className="wf-node-error">
          Запрос отправлен провайдеру. Требуется проверка статуса; автоматический возврат кредитов
          не подтверждён.
        </p>
      )}
      {item.status === 'completed' && (
        <div className="wf-node-actions">
          <button onClick={() => onDerive(item)} title="Создать связанный запрос с тем же промптом">
            Продолжить идею <ArrowUpRight size={13} />
          </button>
          <Link to="/library" title="Генерация автоматически сохранена в истории">
            В библиотеке
          </Link>
          {item.resultVideoUrl && (
            <button
              aria-label="Скачать результат"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                setDownloadError('');
                try {
                  await downloadVideo(item.id);
                } catch (err) {
                  setDownloadError(err.message);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <Download size={14} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function InteractiveCanvas({
  items,
  loading,
  error,
  positions,
  connections,
  onMove,
  onDerive,
  onOpen,
}) {
  const canvas = useRef(null),
    pointers = useRef(new Map()),
    gesture = useRef(null),
    frame = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 }),
    [selected, setSelected] = useState(null),
    [dragging, setDragging] = useState(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const resolved = Object.fromEntries(
    items.map((item, index) => [item.id, positions[item.id] || nodePosition(index)]),
  );
  const latest = useRef({ resolved, onMove });
  latest.current = { resolved, onMove };
  const focusedRequest = useRef(null);
  useEffect(() => {
    const request = items.findLast((item) => item.id.startsWith('request-'));
    if (!request || request.id === focusedRequest.current) return;
    focusedRequest.current = request.id;
    const position = latest.current.resolved[request.id];
    setViewport({
      x: canvas.current.clientWidth / 2 - 150 - position.x,
      y: 70 - position.y,
      zoom: 1,
    });
  }, [items]);
  const zoomAt = useCallback((factor, point) => {
    setViewport((current) => {
      const zoom = clamp(current.zoom * factor, 0.35, 1.8),
        ratio = zoom / current.zoom;
      return {
        x: point.x - (point.x - current.x) * ratio,
        y: point.y - (point.y - current.y) * ratio,
        zoom,
      };
    });
  }, []);
  useEffect(() => {
    const element = canvas.current;
    const wheel = (event) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', wheel);
      cancelAnimationFrame(frame.current);
    };
  }, [zoomAt]);
  function fit() {
    if (!items.length) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const rect = canvas.current.getBoundingClientRect();
    const values = Object.values(resolved),
      minX = Math.min(...values.map((p) => p.x)),
      minY = Math.min(...values.map((p) => p.y));
    const width = Math.max(...values.map((p) => p.x + 300)) - minX,
      height = Math.max(...values.map((p) => p.y + 320)) - minY;
    const zoom = clamp(
      Math.min((rect.width - 70) / width, (rect.height - 240) / height),
      0.35,
      1.2,
    );
    setViewport({ zoom, x: (rect.width - width * zoom) / 2 - minX * zoom, y: 45 - minY * zoom });
  }
  function down(event) {
    if (event.button !== 0 || event.target.closest('a,button,video,input,textarea,select')) return;
    const handle = event.target.closest('[data-node-handle]');
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()],
        rect = canvas.current.getBoundingClientRect();
      gesture.current = {
        type: 'pinch',
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        point: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
        viewport: { ...viewportRef.current },
      };
    } else {
      gesture.current = {
        type: handle ? 'node' : 'pan',
        id: handle?.dataset.nodeHandle,
        start: { x: event.clientX, y: event.clientY },
        position: handle ? { ...resolved[handle.dataset.nodeHandle] } : { ...viewportRef.current },
        zoom: viewportRef.current.zoom,
      };
      if (handle) setSelected(handle.dataset.nodeHandle);
    }
    setDragging(true);
  }
  function move(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;
    if (!current) return;
    cancelAnimationFrame(frame.current);
    const x = event.clientX,
      y = event.clientY;
    frame.current = requestAnimationFrame(() => {
      if (current.type === 'pinch' && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()],
          rect = canvas.current.getBoundingClientRect(),
          v = current.viewport;
        const zoom = clamp(
            (v.zoom * Math.hypot(b.x - a.x, b.y - a.y)) / Math.max(1, current.distance),
            0.35,
            1.8,
          ),
          ratio = zoom / v.zoom;
        setViewport({
          zoom,
          x: (a.x + b.x) / 2 - rect.left - (current.point.x - v.x) * ratio,
          y: (a.y + b.y) / 2 - rect.top - (current.point.y - v.y) * ratio,
        });
      } else if (current.type === 'node')
        latest.current.onMove(current.id, {
          x: current.position.x + (x - current.start.x) / current.zoom,
          y: current.position.y + (y - current.start.y) / current.zoom,
        });
      else if (current.type === 'pan')
        setViewport({
          ...current.position,
          x: current.position.x + x - current.start.x,
          y: current.position.y + y - current.start.y,
        });
    });
  }
  function up(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 1) {
      const [point] = [...pointers.current.values()];
      gesture.current = { type: 'pan', start: point, position: { ...viewportRef.current } };
    } else {
      gesture.current = null;
      setDragging(false);
    }
  }
  const edges = items.flatMap((item) => {
    const parentId = item.parentId || connections[item.id];
    return parentId && resolved[parentId]
      ? [{ id: item.id, from: resolved[parentId], to: resolved[item.id] }]
      : [];
  });
  return (
    <div
      ref={canvas}
      className={`wf-canvas ${dragging ? 'is-dragging' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-label="Интерактивная рабочая доска"
    >
      <div
        className="wf-canvas-grid"
        style={{
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        }}
      />
      <div
        className="wf-canvas-scene"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        <svg className="wf-canvas-edges" aria-hidden="true">
          {edges.map(({ id, from, to }) => (
            <path
              key={id}
              d={`M ${from.x + 300} ${from.y + 155} C ${from.x + 365} ${from.y + 155}, ${to.x - 65} ${to.y + 155}, ${to.x} ${to.y + 155}`}
            />
          ))}
        </svg>
        {items.map((item) => (
          <GenerationNode
            key={item.id}
            item={item}
            position={resolved[item.id]}
            selected={selected === item.id}
            onSelect={setSelected}
            onMove={onMove}
            onOpen={onOpen}
            onDerive={onDerive}
          />
        ))}
      </div>
      {loading ? (
        <div className="wf-canvas-empty">
          <LoaderCircle className="spin" size={28} />
          <p>Загружаем твоё пространство…</p>
        </div>
      ) : (
        !items.length && (
          <div className="wf-canvas-empty">
            <span className="wf-empty-symbol">✦</span>
            <span className="eyebrow">ЗДЕСЬ НАЧИНАЕТСЯ НОВАЯ ИДЕЯ</span>
            <h2>
              Дай воображению
              <br />
              <span className="dim">пространство.</span>
            </h2>
            <p>
              Опиши сцену внизу.
              <br />
              Каждая генерация появится отдельным узлом.
            </p>
          </div>
        )
      )}
      {error && (
        <p className="wf-canvas-error" role="alert">
          <AlertCircle size={15} />
          {error}
        </p>
      )}
      <div className="wf-canvas-tools" role="group" aria-label="Масштаб доски">
        <button
          aria-label="Уменьшить масштаб"
          onClick={() =>
            zoomAt(0.85, { x: canvas.current.clientWidth / 2, y: canvas.current.clientHeight / 3 })
          }
        >
          <Minus size={16} />
        </button>
        <span>{Math.round(viewport.zoom * 100)}%</span>
        <button
          aria-label="Увеличить масштаб"
          onClick={() =>
            zoomAt(1.15, { x: canvas.current.clientWidth / 2, y: canvas.current.clientHeight / 3 })
          }
        >
          <Plus size={16} />
        </button>
        <button aria-label="Показать все узлы" onClick={fit}>
          <Focus size={16} />
        </button>
      </div>
      <span className="wf-canvas-hint">Перетаскивай доску · Масштабируй колёсиком</span>
    </div>
  );
}
