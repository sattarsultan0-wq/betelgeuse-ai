import { useI18n } from '../../i18n/index';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AudioLines, Boxes, FileText, ImagePlus, Play, Video, X } from 'lucide-react';
import ModelCarousel from './ModelCarousel';

export default function WorkflowToolbar({
  active,
  models,
  modelsLoading,
  modelError,
  onAddPrompt,
  onAddModel,
  onFile,
  error,
  busy,
}) {
  const { t } = useI18n();
  const [tool, setTool] = useState(null),
    [modelsOpen, setModelsOpen] = useState(false),
    [prompt, setPrompt] = useState('');
  const root = useRef(null),
    promptInput = useRef(null),
    image = useRef(null),
    video = useRef(null),
    trigger = useRef(null);
  const reduced = useReducedMotion();
  const close = () => {
    setTool(null);
    trigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!active) {
      setTool(null);
      setModelsOpen(false);
    }
  }, [active]);
  useEffect(() => {
    if (modelsOpen && active) root.current?.querySelector('.wf-pro-model-option')?.focus();
  }, [modelsOpen, active]);
  useEffect(() => {
    if (!tool || !active) return;
    if (tool === 'prompt') promptInput.current?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setTool(null);
    };
    const key = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setTool(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [tool, active]);
  function toggle(name, event) {
    trigger.current = event.currentTarget;
    setTool((current) => (current === name ? null : name));
  }
  const tools = [
    { id: 'models', label: 'Models', Icon: Boxes },
    { id: 'prompt', label: 'Prompt', Icon: FileText },
    { id: 'image', label: 'Image', Icon: ImagePlus },
    { id: 'video', label: 'Video', Icon: Video },
    { id: 'audio', label: 'Audio', Icon: AudioLines, disabled: true, title: 'Coming soon' },
    { id: 'start', label: 'Start', Icon: Play, disabled: true, title: 'Coming soon' },
  ];
  return (
    <div ref={root} className="wf-pro-dock">
      <div className="wf-pro-popover-anchor is-models">
        <AnimatePresence>
          {active && modelsOpen && (
            <motion.div
              className="wf-pro-popover"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 8 }}
              transition={{ duration: reduced ? 0.1 : 0.18 }}
            >
              <ModelCarousel
                models={models}
                onSelect={onAddModel}
                loading={modelsLoading}
                error={modelError}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={`wf-pro-popover-anchor ${modelsOpen ? 'above-models' : ''}`}>
        <AnimatePresence>
          {active && tool && (
            <motion.div
              key={tool}
              className="wf-pro-popover"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 8 }}
              transition={{ duration: reduced ? 0.1 : 0.18 }}
            >
              <form
                className="wf-pro-prompt-popover"
                role="dialog"
                aria-label={t('Добавить Prompt')}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!prompt.trim()) return;
                  onAddPrompt(prompt.trim());
                  setPrompt('');
                  close();
                }}
              >
                <header>
                  <span>{t('Prompt')}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('Закрыть Prompt')}
                    onClick={close}
                  >
                    <X size={16} />
                  </button>
                </header>
                <textarea
                  ref={promptInput}
                  aria-label={t('Новый промпт')}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={t('Опиши свою идею…')}
                  maxLength={2000}
                  rows={5}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter')
                      event.currentTarget.form.requestSubmit();
                  }}
                />
                <footer>
                  <small>{t(prompt.length)} / 2000</small>
                  <button className="glass-button primary compact" disabled={!prompt.trim()}>
                    {t('Add')}
                  </button>
                </footer>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <p className="wf-pro-tool-error" role="alert">
          {t(error)}
        </p>
      )}
      {busy && (
        <span className="wf-pro-file-status" role="status">
          {t('Сохраняем файл…')}
        </span>
      )}
      <div className="wf-pro-toolbar" role="toolbar" aria-label={t('Инструменты Professional')}>
        {tools.map(({ id, label, Icon, disabled, title }) => (
          <span className="wf-pro-tool-wrap" key={id} title={t(title || label)}>
            <button
              type="button"
              className={`wf-pro-tool ${id === 'start' ? 'wf-pro-start' : ''}`}
              aria-label={t(label)}
              aria-expanded={
                id === 'models' ? modelsOpen : id === 'prompt' ? tool === id : undefined
              }
              disabled={disabled || (['image', 'video'].includes(id) && busy)}
              onClick={(event) => {
                if (id === 'models') setModelsOpen((open) => !open);
                else if (id === 'image' || id === 'video') {
                  setTool(null);
                  (id === 'image' ? image : video).current?.click();
                } else toggle(id, event);
              }}
            >
              <Icon size={19} />
            </button>
            <span>{t(label)}</span>
          </span>
        ))}
      </div>
      <input
        className="sr-only"
        ref={image}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        aria-label={t('Файл Image Node')}
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files[0];
          if (file) onFile(file, 'image');
          event.target.value = '';
        }}
      />
      <input
        className="sr-only"
        ref={video}
        type="file"
        accept="video/mp4,video/webm,.mp4,.webm"
        aria-label={t('Файл Video Node')}
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files[0];
          if (file) onFile(file, 'video');
          event.target.value = '';
        }}
      />
    </div>
  );
}
