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
  openingCash?: number;
  openingStock: CashierStockSnapshot[];
  closedAt?: string;
  closer?: CashierOperator;
  actualCash?: number;
  remarks?: string;
  closingStock?: CashierStockSnapshot[];
};

export type OpenCashierSessionDto = {
  openingCash: number;
  items?: Array<{
    itemId: string;
    openingQty: number;
  }>;
};

export type CloseCashierSessionDto = {
  actualCash: number;
  remarks?: string;
  items: Array<{
    itemId: string;
    actualQty: number;
  }>;
};
