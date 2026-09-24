'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

type AppDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: AppDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Keep a stable ref to onClose so the keyboard handler never becomes stale
  // but we don't re-register the listener every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ── Effect 1: initial focus + scroll lock ────────────────────────────────
  // Runs only when `open` flips true. Does NOT re-run on subsequent renders
  // caused by the parent state changing (e.g. typing into a form field).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened
      wasOpenRef.current = true;
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable child after paint
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const first = panel.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
        (first ?? panel).focus();
      });
    } else if (!open && wasOpenRef.current) {
      // Dialog just closed
      wasOpenRef.current = false;
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Cleanup scroll lock if component unmounts while open
  useEffect(() => {
    return () => {
      if (wasOpenRef.current) {
        document.body.style.overflow = '';
      }
    };
  }, []);

  // ── Effect 2: keyboard trap ──────────────────────────────────────────────
  // Registered once when the dialog opens; removed when it closes.
  // Uses onCloseRef so it's always current without re-registering.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]); // only [open] — no onClose dependency

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.18)] ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-[var(--muted)]"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--surface-muted)] active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
