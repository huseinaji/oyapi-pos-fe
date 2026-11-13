export type StockAdjustmentType = 'receive' | 'issue';

export type CreateStockAdjustmentDto = {
  type: StockAdjustmentType;
  remarks?: string;
  items: {
    itemId: string;
    qty: number;
  }[];
};

export type StockAdjustmentItem = {
  id?: string;
  stockAdjustmentId?: string;
  itemId: string;
  qty: number;
  items?: {
    name: string;
    description?: string | null;
    uom: string;
    sellingPrice?: number;
  } | null;
};

export type StockAdjustment = {
  id: string;
  storeId: string;
  type: StockAdjustmentType;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  items: StockAdjustmentItem[];
};

export type StockAdjustmentListResponse = {
  count: number;
  rows: StockAdjustment[];
};
