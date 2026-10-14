import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

function ModalContent({ title, children, onClose, className, showTitle }) {
  const reduced = useReducedMotion();
  const ref = useRef(null),
    callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    function key(event) {
      if (event.key === 'Escape') callback.current();
      if (event.key === 'Tab') {
        const focusable = [
          ...ref.current.querySelectorAll('button,a,input,textarea,select,[tabindex="0"]'),
        ].filter(
          (element) =>
            !element.disabled && element.tabIndex >= 0 && element.getClientRects().length,
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
      transition={{ duration: reduced ? 0.12 : 0.28, ease: 'easeOut' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className={`modal glass ${className}`}
        variants={{
          hidden: {
            opacity: 0,
            y: reduced ? 0 : 24,
            scale: reduced ? 1 : 0.96,
            transition: { duration: reduced ? 0.12 : 0.22, ease: 'easeIn' },
          },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: reduced ? 0.12 : 0.4, ease: [0.22, 1, 0.36, 1] },
          },
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <button className="icon-button modal-close" aria-label="Закрыть" onClick={onClose}>
          <X size={20} />
        </button>
        {showTitle && <h2>{title}</h2>}
        {children}
      </motion.section>
    </motion.div>
  );
}

export default function Modal({
  open = true,
  title,
  children,
  onClose,
  className = '',
  showTitle = true,
  onExitComplete,
}) {
  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <ModalContent key="dialog" {...{ title, children, onClose, className, showTitle }} />
      )}
    </AnimatePresence>,
    document.body,
  );
}
