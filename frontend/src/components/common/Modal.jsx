import { useEffect, useRef, useCallback } from 'react';

const Modal = ({ isOpen, onClose, title, children, force = false, className = '' }) => {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && !force && onClose) {
      onClose();
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }, [force, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={force ? undefined : onClose} role="presentation">
      <div
        className={`modal ${className}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title" className="modal__title">{title}</h2>
          {!force && (
            <button className="modal__close" onClick={onClose} aria-label="Close dialog" type="button">
              ×
            </button>
          )}
        </div>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
