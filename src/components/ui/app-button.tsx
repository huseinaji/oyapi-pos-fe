type AppButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'inverted' | 'secondary-inverted';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
};

export function AppButton({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled,
}: AppButtonProps) {
  const base =
    'inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
  const styles =
    variant === 'primary'
      ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
      : variant === 'inverted'
        ? 'bg-[var(--band-text)] text-[var(--accent-strong)] hover:bg-white/90'
        : variant === 'secondary-inverted'
          ? 'border border-white/30 bg-white/10 text-[var(--band-text)] hover:bg-white/20'
          : 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}
