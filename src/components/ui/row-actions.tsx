'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { MoreHorizontal } from 'lucide-react';

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
};

type RowActionsProps = {
  actions: RowAction[];
  label?: string;
};

export function RowActions({
  actions,
  label = 'Row actions',
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 'auto' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 160; // min-w-[160px]
    const dropdownHeight = actions.length * 40 + 8; // approximate
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceOnRight = viewportWidth - buttonRect.right;
    const spaceBelow = viewportHeight - buttonRect.bottom;

    // Calculate position
    const top =
      spaceBelow >= dropdownHeight
        ? buttonRect.bottom + 6 // 6px = mt-1.5
        : buttonRect.top - dropdownHeight - 6;

    const alignRight = spaceOnRight >= dropdownWidth;

    setPosition({
      top,
      left: alignRight ? buttonRect.right - dropdownWidth : buttonRect.left,
      right: 'auto',
    });
  }, [open, actions.length]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const dropdown = open && (
    <div
      ref={dropdownRef}
      role="menu"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      className="min-w-[160px] overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.14)]"
    >
      {actions.map((action, i) => {
        const Icon = action.icon;
        const itemClass = `flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition ${
          action.disabled
            ? 'cursor-not-allowed opacity-40'
            : action.danger
              ? 'text-[var(--status-danger)] hover:bg-[var(--status-danger)]/8'
              : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
        }`;

        if (action.href && !action.disabled) {
          return (
            <Link
              key={i}
              to={action.href}
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              {Icon && <Icon size={14} />}
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            className={itemClass}
            onClick={() => {
              if (!action.disabled) {
                setOpen(false);
                action.onClick?.();
              }
            }}
          >
            {Icon && <Icon size={14} />}
            {action.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] active:scale-95"
      >
        <MoreHorizontal size={15} />
      </button>

      {typeof document !== 'undefined' &&
        dropdown &&
        createPortal(dropdown, document.body)}
    </>
  );
}
