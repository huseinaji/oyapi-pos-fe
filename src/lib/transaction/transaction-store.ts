import { createStore } from "#lib/store-utils";
import type { SalesInvoice } from "@/types/api";
import type { Transaction } from "@/types/inde";
import { transactionsApi } from "./transactions-api";


function mapInvoice(invoice: SalesInvoice): Transaction {
  return {
    id: invoice.id,
    invoice: invoice.invoiceId,
    customer: invoice.customer?.trim() || 'Walk-in Customer',
    paymentMethod: invoice.paymentMethod,
    status:
      invoice.status === 'complete' || invoice.status === 'compeleted'
        ? 'complete'
        : 'pending',
    subtotal: invoice.totalAmount,
    discount: 0,
    tax: 0,
    total: invoice.totalAmount,
    cashier: invoice.creator?.username ?? 'System',
    date: new Date(invoice.createdAt).toLocaleString('id-ID'),
    recordedAt: invoice.createdAt,
    items: invoice.salesInvoiceItems.map((item) => ({
      id: item.id,
      transactionId: invoice.id,
      productId: item.itemId,
      name: item.item?.name ?? item.itemId,
      uom: item.item?.uom ?? '',
      description: item.item?.description,
      qty: item.qty,
      total: item.amount,
    })),
  };
}

type TransactionState = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  fetchTransactionById: (id: string) => Promise<void>;
  completeTransaction: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransaction: (transaction: Transaction) => void;
  getTransaction: (id: string) => Transaction | undefined;
  updateStatus: (id: string, status: Transaction['status']) => void;
};

const store: ReturnType<typeof createStore<TransactionState>> =
  createStore<TransactionState>({
    transactions: [],
    isLoading: false,
    error: null,

    async fetchTransactions() {
      store.setState({ isLoading: true, error: null });
      try {
        const response = await transactionsApi.list();
        store.setState({
          transactions: (response.rows ?? []).map(mapInvoice),
          isLoading: false,
        });
      } catch (error) {
        store.setState({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load transactions',
        });
      }
    },

    async fetchTransactionById(id) {
      // Return early if already cached
      const cached = store.getState().transactions.find((tx) => tx.id === id);
      if (cached) return;

      store.setState({ isLoading: true, error: null });
      try {
        const invoice = await transactionsApi.getById(id);
        const mapped = mapInvoice(invoice);
        store.setState((prev) => ({
          isLoading: false,
          // Merge: replace if exists, prepend if new
          transactions: prev.transactions.some((tx) => tx.id === id)
            ? prev.transactions.map((tx) => (tx.id === id ? mapped : tx))
            : [mapped, ...prev.transactions],
        }));
      } catch (error) {
        store.setState({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load transaction',
        });
      }
    },

    async completeTransaction(id) {
      await transactionsApi.complete(id);
      store.setState((prev) => ({
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, status: 'complete' } : tx,
        ),
      }));
    },

    async deleteTransaction(id) {
      await transactionsApi.delete(id);
      store.setState((prev) => ({
        transactions: prev.transactions.filter((tx) => tx.id !== id),
      }));
    },

    addTransaction: (transaction) =>
      store.setState((prev) => ({
        transactions: [transaction, ...prev.transactions],
      })),

    getTransaction: (id) =>
      store.getState().transactions.find((tx) => tx.id === id),

    updateStatus: (id, status) =>
      store.setState((prev) => ({
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, status } : tx,
        ),
      })),
  });

export const useTransactionStore = store.useStore;

export const transactionStore = {
  fetchTransactions: () => store.getState().fetchTransactions(),
  fetchTransactionById: (id: string) =>
    store.getState().fetchTransactionById(id),
  completeTransaction: (id: string) => store.getState().completeTransaction(id),
  deleteTransaction: (id: string) => store.getState().deleteTransaction(id),
  addTransaction: (tx: Transaction) => store.getState().addTransaction(tx),
};
