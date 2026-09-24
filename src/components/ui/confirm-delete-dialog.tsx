'use client';

import { AlertTriangle } from 'lucide-react';
import { AppButton } from './app-button';
import { AppDialog } from './app-dialog';

type ConfirmDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description: string;
  itemName?: string;
  confirmLabel?: string;
  blocked?: boolean;
  blockedReason?: string;
};

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm deletion',
  description,
  itemName,
  confirmLabel = 'Delete',
  blocked = false,
  blockedReason,
}: ConfirmDeleteDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-[12px] border p-4 ${
            blocked
              ? 'border-[var(--status-pending)]/30 bg-[var(--status-pending)]/10'
              : 'border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5'
          }`}
        >
          <AlertTriangle
            size={20}
            className={`mt-0.5 shrink-0 ${blocked ? 'text-[var(--status-pending)]' : 'text-[var(--status-danger)]'}`}
          />
          <div className="text-sm">
            {itemName && (
              <p className="font-semibold text-[var(--foreground)]">
                &ldquo;{itemName}&rdquo;
              </p>
            )}
            {blocked && blockedReason ? (
              <p className="mt-1 text-[var(--muted)]">{blockedReason}</p>
            ) : (
              <p className="mt-1 text-[var(--muted)]">
                This action cannot be undone. The item will be permanently
                removed.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          {!blocked && (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-[var(--status-danger)] px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </AppDialog>
  );
}
