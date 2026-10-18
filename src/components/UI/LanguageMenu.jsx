import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { languages } from '../../i18n/preferences';
import { useI18n } from '../../i18n';

export default function LanguageMenu() {
  const { t, language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    trigger = useRef(null),
    menu = useRef(null);
  const pointerWithin = useRef(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="language-menu"
      ref={root}
      onPointerDownCapture={() => {
        pointerWithin.current = true;
      }}
      onPointerCancelCapture={() => {
        pointerWithin.current = false;
      }}
      onClickCapture={() => {
        pointerWithin.current = false;
      }}
      onKeyDown={(event) => {
        pointerWithin.current = false;
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close();
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            return;
          }
          const items = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
          const current = items.indexOf(document.activeElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
          items[next]?.focus({ preventScroll: true });
        }
        if (event.key === 'Tab') setOpen(false);
      }}
      onBlur={(event) => {
        // Safari may move focus to null or the enclosing dialog before a touch
        // generates click. Keep the menu mounted throughout an internal gesture.
        // Outside pointerdown and Tab still dismiss it independently.
        if (
          !pointerWithin.current &&
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        ) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="language-trigger"
        aria-label={t('Выбрать язык')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={15} aria-hidden="true" />
        <span>{language.toUpperCase()}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div
        ref={menu}
        id={id}
        role="menu"
        aria-label={t('Язык')}
        className="language-options"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        {languages.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            role="menuitemradio"
            aria-checked={language === code}
            lang={code}
            onClick={() => {
              setLanguage(code);
              close();
            }}
          >
            <span>{label}</span>
            {language === code && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
