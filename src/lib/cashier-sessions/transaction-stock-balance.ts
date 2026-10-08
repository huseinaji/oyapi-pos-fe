import type { SalesInvoice } from '#lib/transaction/transaction-types';
import type { CashierStockSnapshot } from './cashier-sessions-db';

export function calculateClosingStockFromSales(
  openingStock: CashierStockSnapshot[],
  invoices: SalesInvoice[],
  openedAt: string,
  closedAt: string,
): CashierStockSnapshot[] {
  const startTime = Date.parse(openedAt);
  const endTime = Date.parse(closedAt);
  const soldByItem = new Map<string, number>();

  for (const invoice of invoices) {
    const createdTime = Date.parse(invoice.createdAt);
    if (
      invoice.deletedAt ||
      !Number.isFinite(createdTime) ||
      createdTime < startTime ||
      createdTime > endTime
    ) {
      continue;
    }

    for (const line of invoice.salesInvoiceItems ?? []) {
      if (!Number.isFinite(line.qty)) continue;
      soldByItem.set(line.itemId, (soldByItem.get(line.itemId) ?? 0) + line.qty);
    }
  }

  return openingStock.map((item) => {
    const soldQuantity = soldByItem.get(item.itemId) ?? 0;
    return {
      ...item,
      quantity: item.quantity - soldQuantity,
      soldQuantity,
    };
  });
}