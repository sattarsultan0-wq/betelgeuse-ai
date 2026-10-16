import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import ModelIdentity from './ModelIdentity';

export default function ModelCarousel({ models, onSelect, loading, error }) {
  const strip = useRef(null),
    drag = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const tooltipId = useId();
  const reduced = useReducedMotion();
  // Provider readiness (`available`) gates generation, not editing the workflow graph.
  const catalog = useMemo(
    () =>
      loading || error
        ? []
        : models.filter((model) => model.enabled && Object.keys(model.modes || {}).length),
    [models, loading, error],
  );
  function showTooltip(model, element) {
    const rect = element.getBoundingClientRect();
    setTooltip({
      model,
      x: Math.max(128, Math.min(window.innerWidth - 128, rect.x + rect.width / 2)),
      bottom: window.innerHeight - rect.top + 10,
    });
  }
  useEffect(() => {
    const element = strip.current;
    const hideTooltip = () => setTooltip(null);
    const wheel = (event) => {
      if (event.ctrlKey || (!event.deltaX && !event.deltaY)) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      element.scrollLeft +=
        delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      hideTooltip();
    };
    element.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('resize', hideTooltip);
    return () => {
      element.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', hideTooltip);
    };
  }, []);
  const message = error
    ? `Не удалось загрузить модели. ${error}`
    : loading
      ? 'Загружаем модели…'
      : models.length
        ? 'В каталоге нет активных моделей.'
        : 'Каталог моделей пуст.';
  return (
    <div className="wf-pro-models-popover" role="dialog" aria-label="Выбор модели">
      <div
        ref={strip}
        className="wf-pro-model-strip"
        role="group"
        aria-label="Каталог моделей"
        data-has-models={catalog.length > 0}
        onScroll={() => {
          if (drag.current?.active) drag.current.moved = true;
          setTooltip(null);
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            id: event.pointerId,
            moved: false,
            active: true,
          };
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current?.active || current.id !== event.pointerId) return;
          if (event.pointerType === 'mouse' && !(event.buttons & 1)) return;
          const delta = event.clientX - current.x;
          if (Math.hypot(delta, event.clientY - current.y) > 6 && !current.moved) {
            current.moved = true;
            setTooltip(null);
            if (event.pointerType === 'mouse')
              event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (current.moved && event.pointerType === 'mouse') {
            event.preventDefault();
            event.currentTarget.scrollLeft = current.left - delta;
          }
        }}
        onPointerUp={(event) => {
          if (drag.current?.id === event.pointerId) drag.current.active = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          // Preserve suppression for browsers that synthesize a click after a cancelled gesture.
          if (drag.current) {
            drag.current.active = false;
            drag.current.moved = true;
          }
          setTooltip(null);
        }}
        onClickCapture={(event) => {
          if (drag.current?.moved && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            drag.current = null;
          }
        }}
      >
        {catalog.map((model) => (
          <button
            key={model.id}
            type="button"
            className="wf-pro-model-option"
            aria-label={model.name}
            aria-describedby={tooltip?.model.id === model.id ? tooltipId : undefined}
            onPointerEnter={(event) => {
              if (
                event.pointerType === 'mouse' &&
                !(event.buttons & 1) &&
                window.matchMedia('(hover: hover) and (pointer: fine)').matches
              )
                showTooltip(model, event.currentTarget);
            }}
            onPointerLeave={() => setTooltip(null)}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible'))
                showTooltip(model, event.currentTarget);
            }}
            onBlur={() => setTooltip(null)}
            onClick={() => onSelect(model)}
          >
            <ModelIdentity model={model} />
          </button>
        ))}
        {!catalog.length && (
          <p className="wf-pro-catalog-note" role={error ? 'alert' : 'status'}>
            {message}
          </p>
        )}
      </div>
      {createPortal(
        <AnimatePresence>
          {tooltip && (
            <div
              key="model-tooltip"
              id={tooltipId}
              role="tooltip"
              className="wf-pro-model-tooltip"
              style={{ left: tooltip.x, bottom: tooltip.bottom }}
            >
              <motion.div
                initial={{ opacity: 0, y: reduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 4 }}
                transition={{ duration: reduced ? 0 : 0.15 }}
              >
                {tooltip.model.name}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
