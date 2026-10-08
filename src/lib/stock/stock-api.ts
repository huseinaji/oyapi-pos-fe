import { Api } from '../api';
import type {
  StockBin,
  StockBinResponse,
  StockLedgerEntry,
  StockLedgerResponse,
} from './stock-types';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' ? (value as RawRecord) : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapEntry(value: unknown, index: number): StockLedgerEntry {
  const raw = asRecord(value);
  const item = asRecord(raw.item);
  const quantity =
    numberValue(raw.quantity) ??
    numberValue(raw.qty) ??
    numberValue(raw.stockValue) ??
    numberValue(raw.amount) ??
    0;

  return {
    id: text(raw.id, `ledger-${index}`),
    itemId: text(raw.itemId ?? item.id),
    itemName: text(raw.itemName ?? item.name, 'Unknown product'),
    type: text(raw.type ?? raw.entryType ?? raw.transactionType, 'Stock entry'),
    quantity,
    balance:
      numberValue(raw.balance) ??
      numberValue(raw.currentStock) ??
      numberValue(raw.stockBalance),
    reference: text(raw.reference ?? raw.referenceId ?? raw.notes, '-'),
    recordedAt: text(raw.createdAt ?? raw.recordedAt ?? raw.updatedAt),
  };
}

function normalizeResponse(value: unknown): StockLedgerResponse {
  const raw = asRecord(value);
  const nested = asRecord(raw.data);
  const source = Array.isArray(value)
    ? value
    : Array.isArray(raw.rows)
      ? raw.rows
      : Array.isArray(raw.data)
        ? raw.data
        : Array.isArray(nested.rows)
          ? nested.rows
        : [];

  return {
    count: numberValue(raw.count) ?? numberValue(nested.count) ?? source.length,
    rows: source.map(mapEntry),
  };
}

function mapBin(value: unknown, index: number): StockBin {
  const raw = asRecord(value);
  const item = asRecord(raw.item);
  return {
    id: text(raw.id, `bin-${index}`),
    itemId: text(raw.itemId ?? item.id),
    itemName: text(raw.itemName ?? item.name, 'Unknown product'),
    stockValue: numberValue(raw.stockValue) ?? 0,
    uom: text(raw.uom ?? item.uom),
  };
}

function normalizeBins(value: unknown): StockBinResponse {
  const raw = asRecord(value);
  const nested = asRecord(raw.data);
  const source = Array.isArray(value)
    ? value
    : Array.isArray(raw.rows)
      ? raw.rows
      : Array.isArray(raw.data)
        ? raw.data
        : Array.isArray(nested.rows)
          ? nested.rows
          : [];

  return {
    count: numberValue(raw.count) ?? numberValue(nested.count) ?? source.length,
    rows: source.map(mapBin),
  };
}

export const stockApi = {
  list: (storeId: string, page: number, limit: number) =>
    Api.get<unknown>(`/api/v1/store/${encodeURIComponent(storeId)}/stock-ledger`, { params: { page, limit } }).then(
      (response) => normalizeResponse(response.data),
    ),
  bins: (
    storeId: string,
    params: { itemId?: string; stockValue?: number; uom?: string; page?: number; limit?: number } = {},
  ) =>
    Api.get<unknown>(`/api/v1/store/${encodeURIComponent(storeId)}/bins`, { params }).then(
      (response) => normalizeBins(response.data),
    ),
};
