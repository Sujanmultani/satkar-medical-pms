import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dialog({ isOpen, onClose, title, description, children, className }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100/80 transition-all transform scale-100 opacity-100',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-lg font-heading font-bold text-primary">{title}</h3>}
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ children, className }) {
  return (
    <div className={cn('mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100', className)}>
      {children}
    </div>
  );
}
