import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Sparkles,
  ImagePlus,
  X,
  ChevronDown,
  Film,
  SlidersHorizontal,
  Clock3,
  Download,
  LoaderCircle,
  Monitor,
  Smartphone,
  Square,
  CircleCheck,
  AlertCircle,
} from 'lucide-react';
import { api, downloadVideo } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useGeneration } from '../../hooks/useGeneration';
const statuses = {
  idle: 'Всё начинается с идеи',
  uploading: 'Загружаем изображение',
  queued: 'В очереди на генерацию',
  processing: 'Создаём твоё видео',
  completed: 'Твоё видео готово',
  failed: 'Не удалось создать видео',
};
const examples = ['Кинематографический космос', 'Жидкий хром', 'Пейзаж другой планеты'];
const prompts = [
  'Медленный облёт огромной планеты с серебристыми кольцами в глубоком космосе. Кинематографическое освещение, монохромная палитра, плавная камера.',
  'Жидкий хром принимает форму абстрактной скульптуры. Чёрная студия, мягкие белые отражения, макросъёмка, медленное движение.',
  'Камера скользит над горными вершинами далёкой планеты. Огромная луна над горизонтом, дымка, кинематографический свет.',
];
export default function Generator() {
  const { user, setDialog, refresh } = useAuth();
  const { generation, phase, error, submit, setError, busy } = useGeneration(user?.id);
  const [models, setModels] = useState([]),
    [modelError, setModelError] = useState(''),
    [modelId, setModelId] = useState('kling'),
    [mode, setMode] = useState('TEXT_TO_VIDEO'),
    [prompt, setPrompt] = useState(''),
    [aspectRatio, setAspectRatio] = useState('16:9'),
    [duration, setDuration] = useState(5),
    [quality, setQuality] = useState('standard'),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(''),
    [dragging, setDragging] = useState(false),
    [dropdown, setDropdown] = useState(false),
    [downloading, setDownloading] = useState(false);
  const textarea = useRef(null),
    input = useRef(null),
    select = useRef(null);
  const model = models.find((item) => item.id === modelId),
    capabilities = model?.modes?.[mode];
  useEffect(() => {
    const controller = new AbortController();
    api('/models', { signal: controller.signal })
      .then((data) => {
        setModels(data.models);
        setModelError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setModelError(err.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const fill = (event) => setPrompt(event.detail);
    window.addEventListener('betelgeuse:prompt', fill);
    return () => window.removeEventListener('betelgeuse:prompt', fill);
  }, []);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = 'auto';
      textarea.current.style.height = `${Math.min(250, Math.max(125, textarea.current.scrollHeight))}px`;
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
    if (!dropdown) return;
    const close = (e) => {
      if (!select.current?.contains(e.target)) setDropdown(false);
    };
    const escape = (e) => {
      if (e.key === 'Escape') setDropdown(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [dropdown]);
  useEffect(() => {
    if (!capabilities) return;
    setAspectRatio((current) =>
      capabilities.aspectRatios.includes(current) ? current : capabilities.aspectRatios[0],
    );
    setDuration((current) =>
      capabilities.durations.includes(current) ? current : capabilities.durations[0],
    );
    setQuality((current) =>
      capabilities.qualities.includes(current) ? current : capabilities.qualities[0],
    );
  }, [capabilities]);
  useEffect(() => {
    if (['completed', 'failed'].includes(generation?.status) && user) refresh().catch(() => {});
  }, [generation?.status]);
  function pickFile(selected) {
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Поддерживаются JPEG, PNG и WebP.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Максимальный размер изображения — 10 МБ.');
      return;
    }
    setError('');
    setFile(selected);
    setMode('IMAGE_TO_VIDEO');
  }
  async function generate() {
    setError('');
    if (!user) {
      setDialog('login');
      return;
    }
    if (!prompt.trim()) {
      setError('Опиши идею для видео.');
      textarea.current?.focus();
      return;
    }
    if (mode === 'IMAGE_TO_VIDEO' && !file) {
      setError('Добавь изображение для этого режима.');
      return;
    }
    if (!capabilities || !model.available) {
      setError('Генерация этой моделью пока недоступна.');
      return;
    }
    await submit(
      { model: modelId, prompt: prompt.trim(), mode, aspectRatio, duration, quality },
      mode === 'IMAGE_TO_VIDEO' ? file : null,
    );
    refresh().catch(() => {});
  }
  const cost = model?.creditCosts?.[duration] ?? null;
  return (
    <section className="generator section container" id="generator">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / СОЗДАЙ ТО, ЧЕГО ЕЩЁ НЕТ</span>
          <h2>
            ТВОЯ ИДЕЯ.
            <br />
            <span className="dim">НАША ТЕХНОЛОГИЯ.</span>
          </h2>
        </div>
        <p>
          Не нужно быть режиссёром.
          <br />
          Достаточно быть собой.
        </p>
      </div>
      <div className="generator-layout">
        <div
          className={`generator-panel glass ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) pickFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="generator-toolbar">
            <div className="mode-tabs" role="group" aria-label="Режим генерации">
              <button
                disabled={busy}
                className={mode === 'TEXT_TO_VIDEO' ? 'active' : ''}
                onClick={() => setMode('TEXT_TO_VIDEO')}
              >
                <Sparkles size={14} />
                Текст в видео
              </button>
              <button
                disabled={busy}
                className={mode === 'IMAGE_TO_VIDEO' ? 'active' : ''}
                onClick={() => setMode('IMAGE_TO_VIDEO')}
              >
                <ImagePlus size={14} />
                Фото в видео
              </button>
            </div>
            <span className="studio-tag">BETELGEUSE STUDIO</span>
          </div>
          <label className="prompt-label" htmlFor="prompt">
            Твоё воображение — единственное ограничение.
          </label>
          <textarea
            id="prompt"
            ref={textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            disabled={busy}
            placeholder="Опиши видео, которое хочешь создать..."
          />
          <div className="prompt-footer">
            <button
              className="text-button"
              onClick={() => setPrompt('')}
              disabled={!prompt || busy}
            >
              <X size={13} />
              Очистить
            </button>
            <span>{prompt.length} / 2000</span>
          </div>
          {mode === 'IMAGE_TO_VIDEO' && (
            <div className="upload-zone">
              {preview ? (
                <div className="image-preview">
                  <img src={preview} alt="Исходное изображение" />
                  <span>
                    {file.name}
                    <small>{(file.size / 1024 / 1024).toFixed(1)} МБ</small>
                  </span>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label="Удалить изображение"
                    onClick={() => {
                      setFile(null);
                      input.current.value = '';
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <button
                  className="upload-button"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  <ImagePlus size={24} />
                  <span>
                    Добавь изображение или перетащи сюда<small>JPEG, PNG, WebP · до 10 МБ</small>
                  </span>
                </button>
              )}
            </div>
          )}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={input}
            onChange={(e) => pickFile(e.target.files[0])}
            tabIndex={-1}
          />
          <div className="generator-settings">
            <div className="model-select" ref={select}>
              <button
                className="setting-control"
                aria-expanded={dropdown}
                disabled={busy}
                onClick={() => setDropdown(!dropdown)}
              >
                <span className="model-symbol">✦</span>
                <span>
                  {model?.name || 'Higgsfield'}
                  <small>{model?.subtitle || 'Подключение модели'}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {dropdown && (
                <div className="model-options glass" role="group" aria-label="Модели">
                  {models.map((item) => (
                    <button
                      key={item.id}
                      disabled={!item.enabled}
                      onClick={() => {
                        setModelId(item.id);
                        setDropdown(false);
                      }}
                    >
                      <span>
                        {item.name}
                        <small>{item.subtitle}</small>
                      </span>
                      <small>
                        {item.enabled ? (item.available ? 'API' : 'Настройка') : 'Скоро'}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="setting-select">
              <Clock3 size={14} />
              <select
                aria-label="Длительность"
                disabled={busy || !capabilities}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {(capabilities?.durations || [5, 10]).map((value) => (
                  <option key={value} value={value}>
                    {value} сек
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
            </label>
            <label className="setting-select">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Качество"
                disabled={busy || !capabilities}
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {(capabilities?.qualities || ['standard']).map((value) => (
                  <option key={value} value={value}>
                    {value === 'standard' ? 'Стандартное' : value}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          <div className="aspect-row">
            <span>Формат</span>
            <div role="group" aria-label="Соотношение сторон">
              {(capabilities?.aspectRatios || ['16:9', '9:16', '1:1']).map((ratio) => (
                <button
                  disabled={busy || !capabilities}
                  className={aspectRatio === ratio ? 'active' : ''}
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio === '16:9' ? (
                    <Monitor size={14} />
                  ) : ratio === '9:16' ? (
                    <Smartphone size={14} />
                  ) : (
                    <Square size={14} />
                  )}{' '}
                  {ratio === 'source' ? 'По изображению' : ratio}
                </button>
              ))}
            </div>
          </div>
          {(error || modelError) && (
            <p className="error generator-error" role="alert">
              <AlertCircle size={15} />
              {error || modelError}
            </p>
          )}
          {model && !model.available && !modelError && (
            <p className="availability-note">
              Сервис генерации готовится к запуску. Исследуй интерфейс и сохрани свою идею.
            </p>
          )}
          <button
            className="glass-button primary generate-button"
            onClick={generate}
            disabled={busy || (!model?.available && !!user)}
          >
            {busy ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={18} />}{' '}
            {busy ? statuses[phase] : 'СГЕНЕРИРОВАТЬ ВИДЕО'}
            {!busy && <ArrowUpRight size={18} />}
          </button>
          <div className="generation-meta">
            <span>
              {user
                ? user.isAdmin
                  ? 'Администратор · без списания кредитов'
                  : `Доступно: ${user.generationCredits ?? 0} ед.`
                : 'Войди, чтобы начать создавать'}
            </span>
            <span>
              {user?.isAdmin ? 0 : cost ?? '—'} ед. квоты / {duration} сек
            </span>
          </div>
        </div>
        <aside
          className={`result-panel glass ${generation?.status === 'completed' ? 'has-result' : ''}`}
          aria-live="polite"
        >
          {generation?.status === 'completed' && generation.resultVideoUrl ? (
            <>
              <video controls playsInline src={generation.resultVideoUrl} preload="metadata" />
              <div className="result-details">
                <span>
                  <CircleCheck size={15} />
                  Видео готово
                </span>
                <button
                  className="glass-button compact"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadVideo(generation.id);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  <Download size={15} />
                  {downloading ? 'Скачивание…' : 'Скачать'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`result-orbit ${busy ? 'orbit-active' : ''}`}>
                <div />
                <div />
                <div />
                <Film size={28} />
              </div>
              <h3>{statuses[phase]}</h3>
              <p>
                {busy
                  ? 'Это может занять несколько минут. Статус обновляется автоматически.'
                  : 'Здесь появится твоё видео. Опиши сцену, выбери настройки — и дай идее ожить.'}
              </p>
              {busy ? (
                <div className="progress-track">
                  <span />
                </div>
              ) : (
                <span className="result-watermark">YOUR NEXT BIG IDEA</span>
              )}
            </>
          )}
        </aside>
      </div>
      <div className="prompt-suggestions">
        <span>Нужна искра?</span>
        {examples.map((example, index) => (
          <button disabled={busy} key={example} onClick={() => setPrompt(prompts[index])}>
            {example}
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
    </section>
  );
}
