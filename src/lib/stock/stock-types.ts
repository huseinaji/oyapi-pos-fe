export type StockLedgerEntry = {
  id: string;
  storeId?: string;
  itemId: string;
  qty?: number;
  ledgerDirection?: StockLedgerDirection;
  balanceAfter?: number;
  status?: StockLedgerStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  item?: { id?: string; name?: string } | null;
  itemName: string;
  type: string;
  quantity: number;
  balance: number | null;
  reference: string;
  recordedAt: string;
};

export type StockLedgerDirection = 
  | 'in'
  | 'out'

export type StockLedgerStatus = 
  | 'active'
  | 'inactive'

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
