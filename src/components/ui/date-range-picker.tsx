'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

export type DateRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  maxDate?: string; // YYYY-MM-DD, defaults to today
  placeholder?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fromYMD(s: string) {
  // Parse as local date to avoid UTC offset issues
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function isoLabel(s: string) {
  if (!s) return '';
  return fromYMD(s).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── Calendar panel ────────────────────────────────────────────────────────────
function CalendarMonth({
  year,
  month,
  from,
  to,
  hovering,
  maxDate,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  from: string;
  to: string;
  hovering: string;
  maxDate: string;
  onDayClick: (d: string) => void;
  onDayHover: (d: string) => void;
}) {
  const firstDow = startOfMonth(year, month).getDay();
  const days = daysInMonth(year, month);

  const inRange = (d: string) => {
    const start = from || '';
    const end = to || hovering;
    if (!start || !end) return false;
    const [s, e] = start < end ? [start, end] : [end, start];
    return d > s && d < e;
  };

  const isFrom = (d: string) => d === from;
  const isTo = (d: string) => d === to;
  const isEdge = (d: string) => isFrom(d) || isTo(d);
  const isDisabled = (d: string) => d > maxDate;

  return (
    <div className="w-full min-w-[224px]">
      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DOW.map((d) => (
          <span
            key={d}
            className="py-1 text-[11px] font-semibold text-[var(--muted)]"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
        {/* Leading empty cells */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <span key={`e${i}`} />
        ))}

        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const edge = isEdge(d);
          const rangeMiddle = inRange(d);
          const disabled = isDisabled(d);

          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onDayClick(d)}
              onMouseEnter={() => !disabled && onDayHover(d)}
              className={`
                relative h-8 w-full text-[13px] transition
                ${disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:z-10'}
                ${
                  edge
                    ? 'z-10 rounded-full bg-[var(--accent-strong)] font-semibold text-[var(--accent-foreground)]'
                    : rangeMiddle
                      ? 'bg-[var(--surface-accent)] text-[var(--accent)]'
                      : disabled
                        ? ''
                        : 'rounded-full hover:bg-[var(--surface-muted)]'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DateRangePicker({
  value,
  onChange,
  maxDate = todayStr(),
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');
  const [hovering, setHovering] = useState('');
  const [draft, setDraft] = useState<DateRange>(value);

  // Which month to show — left panel
  const initialDate = value.from ? fromYMD(value.from) : new Date();
  const [leftYear, setLeftYear] = useState(initialDate.getFullYear());
  const [leftMonth, setLeftMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Right panel = one month ahead of left
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  // Sync draft when value changes externally
  useEffect(() => {
    setDraft(value);
  }, [value.from, value.to]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
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

  const handleDayClick = (d: string) => {
    if (selecting === 'from') {
      setDraft({ from: d, to: '' });
      setSelecting('to');
    } else {
      // If user picks an end before start, swap
      const newRange =
        d < draft.from
          ? { from: d, to: draft.from }
          : { from: draft.from, to: d };
      setDraft(newRange);
      onChange(newRange);
      setSelecting('from');
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const empty = { from: '', to: '' };
    setDraft(empty);
    onChange(empty);
    setSelecting('from');
  };

  const prevMonth = () => {
    if (leftMonth === 0) {
      setLeftMonth(11);
      setLeftYear((y) => y - 1);
    } else setLeftMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (leftMonth === 10) {
      setLeftMonth(11);
    } // right will be Dec
    else if (leftMonth === 11) {
      setLeftMonth(0);
      setLeftYear((y) => y + 1);
    } else setLeftMonth((m) => m + 1);
  };

  const hasValue = value.from || value.to;
  const displayLabel = hasValue
    ? value.from && value.to
      ? `${isoLabel(value.from)} – ${isoLabel(value.to)}`
      : value.from
        ? `From ${isoLabel(value.from)}`
        : `To ${isoLabel(value.to)}`
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-[12px] border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 ${
          open
            ? 'border-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--accent)]/40'
        } bg-[var(--card)]`}
      >
        <CalendarDays size={15} className="shrink-0 text-[var(--muted)]" />
        <span
          className={`flex-1 text-left ${hasValue ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
        >
          {displayLabel}
        </span>
        {hasValue && (
          <span
            onClick={handleClear}
            className="rounded-full p-0.5 text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--status-danger)]"
            role="button"
            aria-label="Clear date range"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-max rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.14)]">
          {/* Header: month nav */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex flex-1 justify-around text-sm font-semibold">
              <span>
                {MONTHS[leftMonth]} {leftYear}
              </span>
              <span>
                {MONTHS[rightMonth]} {rightYear}
              </span>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Hint */}
          <p className="mb-3 text-center text-xs text-[var(--muted)]">
            {selecting === 'from' ? 'Select start date' : 'Select end date'}
          </p>

          {/* Two-month grid */}
          <div className="flex gap-6">
            <CalendarMonth
              year={leftYear}
              month={leftMonth}
              from={draft.from}
              to={draft.to}
              hovering={hovering}
              maxDate={maxDate}
              onDayClick={handleDayClick}
              onDayHover={setHovering}
            />
            <div className="w-px bg-[var(--border)]" />
            <CalendarMonth
              year={rightYear}
              month={rightMonth}
              from={draft.from}
              to={draft.to}
              hovering={hovering}
              maxDate={maxDate}
              onDayClick={handleDayClick}
              onDayHover={setHovering}
            />
          </div>
        </div>
      )}
    </div>
  );
}
