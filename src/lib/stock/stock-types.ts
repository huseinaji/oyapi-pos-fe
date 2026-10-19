import type { ItemUom } from '../product/product-types';

export type StockLedgerEntry = {
  id: string;
  reference: string;
  referenceId: string;
  remarks?: string;
  storeId: string;
  itemId: string;
  qty: number;
  ledgerDirection: StockLedgerDirection;
  balanceAfter: number;
  status: StockLedgerStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  item: {
    name: string;
    description: string;
    uom: ItemUom;
    sellingPrice: number;
  };
};

export type StockLedgerDirection = 'in' | 'out';

export type StockLedgerStatus = 'active' | 'inactive';

export type StockLedgerResponse = {
  count: number;
  rows: StockLedgerEntry[];
};

export type StockBin = {
  id: string;
  itemId: string;
  itemName: string;
  stockValue: number;
  uom: string;
};

export type StockBinResponse = {
  count: number;
  rows: StockBin[];
};
