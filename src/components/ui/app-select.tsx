'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const choose = (option: AppSelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[12px] border-0 bg-[var(--surface-muted)] px-4 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={
            selected ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
          }
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-[var(--accent)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-[70] max-h-64 w-full overflow-auto rounded-[14px] border border-[var(--accent)]/35 bg-[var(--card)] p-1.5 shadow-[0_0_24px_rgba(0,0,0,0.2),0_0_18px_rgba(88,166,255,0.12)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => choose(option)}
                className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected
                    ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--accent)]/8 hover:text-[var(--accent)]'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
