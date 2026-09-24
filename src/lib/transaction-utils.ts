import type { Transaction } from '../types/inde';

export type TransactionFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  cashier: string;
  status: 'all' | Transaction['status'];
  payment: 'all' | Transaction['paymentMethod'];
};

export function formatRp(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const from = filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : null;
  const to = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : null;

  return transactions
    .filter((transaction) => {
      const recorded = new Date(transaction.recordedAt);

      const matchesQuery =
        filters.query === '' ||
        `${transaction.invoice} ${transaction.customer} ${transaction.cashier}`
          .toLowerCase()
          .includes(filters.query.toLowerCase());

      const matchesDateFrom = !from || recorded >= from;
      const matchesDateTo = !to || recorded <= to;
      const matchesCustomer =
        filters.customer === 'all' || transaction.customer === filters.customer;
      const matchesCashier =
        filters.cashier === 'all' || transaction.cashier === filters.cashier;
      const matchesStatus =
        filters.status === 'all' || transaction.status === filters.status;
      const matchesPayment =
        filters.payment === 'all' ||
        transaction.paymentMethod === filters.payment;

      return (
        matchesQuery &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesCustomer &&
        matchesCashier &&
        matchesStatus &&
        matchesPayment
      );
    })
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
}

export function getUniqueValues(transactions: Transaction[]) {
  const customers = [...new Set(transactions.map((tx) => tx.customer))].sort();
  const cashiers = [...new Set(transactions.map((tx) => tx.cashier))].sort();
  return { customers, cashiers };
}

export function countActiveFilters(filters: TransactionFilters) {
  let count = 0;
  if (filters.query) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (filters.customer !== 'all') count += 1;
  if (filters.cashier !== 'all') count += 1;
  if (filters.status !== 'all') count += 1;
  if (filters.payment !== 'all') count += 1;
  return count;
}

export const defaultTransactionFilters: TransactionFilters = {
  query: '',
  dateFrom: '',
  dateTo: '',
  customer: 'all',
  cashier: 'all',
  status: 'all',
  payment: 'all',
};

export const statusStyles: Record<Transaction['status'], string> = {
  complete: 'bg-[var(--surface-accent)] text-[var(--status-success)]',
  pending: 'bg-[var(--status-pending)]/15 text-[var(--status-pending)]',
};
