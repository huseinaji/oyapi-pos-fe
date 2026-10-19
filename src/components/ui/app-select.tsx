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
  floating?: boolean;
  compact?: boolean;
  'aria-label'?: string;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  floating = false,
  compact = false,
  'aria-label': ariaLabel,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !listboxRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open || !floating) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom - 8;
      const availableAbove = rect.top - 8;
      const opensAbove =
        availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(
        80,
        Math.min(256, opensAbove ? availableAbove : availableBelow),
      );
      const width = Math.min(rect.width, window.innerWidth - 16);

      setMenuPosition({
        top: opensAbove
          ? Math.max(8, rect.top - maxHeight - 6)
          : Math.min(
              rect.bottom + 6,
              window.innerHeight - maxHeight - 8,
            ),
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - width - 8),
        ),
        width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, floating]);

  const choose = (option: AppSelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  };

  const listbox = open && (
    <div
      ref={listboxRef}
      id={listboxId}
      role="listbox"
      style={
        floating && menuPosition
          ? {
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }
          : undefined
      }
      className={`${floating ? 'fixed' : 'absolute left-0 top-[calc(100%+6px)]'} z-[70] max-h-64 w-full overflow-auto rounded-[14px] border border-[var(--accent)]/35 bg-[var(--card)] p-1.5 shadow-[0_0_24px_rgba(0,0,0,0.2),0_0_18px_rgba(88,166,255,0.12)]`}
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
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!open && floating) {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) {
              const maxHeight = Math.max(
                80,
                Math.min(256, window.innerHeight - rect.bottom - 8),
              );
              const width = Math.min(rect.width, window.innerWidth - 16);
              setMenuPosition({
                top: Math.min(
                  rect.bottom + 6,
                  window.innerHeight - maxHeight - 8,
                ),
                left: Math.max(
                  8,
                  Math.min(rect.left, window.innerWidth - width - 8),
                ),
                width,
                maxHeight,
              });
            }
          }
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-[12px] border-0 bg-[var(--surface-muted)] text-left text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? 'min-h-11 px-3 py-2' : 'px-4 py-3'
        }`}
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

      {listbox}
    </div>
  );
}
