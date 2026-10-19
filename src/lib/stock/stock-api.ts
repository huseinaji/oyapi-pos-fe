import { Api } from '../api';
import type { StockBinResponse, StockLedgerResponse } from './stock-types';

export const stockApi = {
  list: (storeId: string, page: number, limit: number) =>
    Api.get<StockLedgerResponse>(`/api/v1/store/${encodeURIComponent(storeId)}/stock-ledger`, { params: { page, limit } }).then(
      (response) => response.data ,
    ),
  bins: (
    storeId: string,
    params: { itemId?: string; stockValue?: number; uom?: string; page?: number; limit?: number } = {},
  ) =>
    Api.get<StockBinResponse>(`/api/v1/store/${encodeURIComponent(storeId)}/bins`, { params }).then(
      (response) => response.data,
    ),
};
