export type CashierSessionStatus = 'OPEN' | 'CLOSED';

export type CashierStockSnapshot = {
  itemId: string;
  itemName: string;
  uom: string;
  quantity: number;
  soldQuantity?: number;
};

export type CashierOperator = {
  userId: string;
  username: string;
};

export type CashierSession = {
  id: string;
  storeId: string;
  status: CashierSessionStatus;
  openedAt: string;
  openedBy: CashierOperator;
  participants?: CashierOperator[];
  openingStock: CashierStockSnapshot[];
  closedAt?: string;
  closedBy?: CashierOperator;
  closingStock?: CashierStockSnapshot[];
};

export type OpenCashierSessionDto = {
  items: Array<{
    itemId: string;
    openingStock: number;
  }>;
};