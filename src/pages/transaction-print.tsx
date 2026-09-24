import { useEffect } from 'react';
import { useParams } from 'react-router';
import { formatRp } from '../lib/transaction-utils';
import { useTransactionStore } from '#lib/transaction/transaction-store';

export default function TransactionPrintPage() {
  const { id = '' } = useParams<{ id: string }>();

  const transaction = useTransactionStore((state) =>
    state.transactions.find((tx) => tx.id === id),
  );
  const isLoading = useTransactionStore((state) => state.isLoading);
  const fetchTransactionById = useTransactionStore(
    (state) => state.fetchTransactionById,
  );

  useEffect(() => {
    if (!id) return;
    void fetchTransactionById(id);
  }, [id, fetchTransactionById]);

  if (isLoading && !transaction) {
    return (
      <p className="p-8 text-sm text-[var(--muted)]">Loading receipt...</p>
    );
  }

  if (!transaction) {
    return (
      <p className="p-8 text-sm text-[var(--muted)]">Receipt not found.</p>
    );
  }

  return (
    <main className="mx-auto max-w-md bg-white p-8 text-black print:max-w-none">
      <div className="text-center">
        <h1 className="text-xl font-bold">POS Studio</h1>
        <p className="text-sm">Receipt</p>
        <p className="mt-4 text-sm">{transaction.invoice}</p>
      </div>

      <div className="my-5 border-t border-dashed border-black" />

      {transaction.items.map((item) => (
        <div key={item.id} className="flex justify-between py-1 text-sm">
          <span>
            {item.name} × {item.qty}
          </span>
          <span>{formatRp(item.total)}</span>
        </div>
      ))}

      <div className="my-5 border-t border-dashed border-black" />

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRp(transaction.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>{formatRp(transaction.discount)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatRp(transaction.total)}</span>
        </div>
      </div>

      <p className="mt-8 text-center text-sm">Thank you for your purchase!</p>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-6 w-full rounded-lg border border-black px-4 py-2 text-sm print:hidden"
      >
        Print
      </button>
    </main>
  );
}
