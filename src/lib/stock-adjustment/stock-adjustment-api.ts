import { Api } from '@/lib/api';
import type {
  CreateStockAdjustmentDto,
  StockAdjustment,
  StockAdjustmentListResponse,
} from './stock-adjustment-types';

function stockAdjustmentPath(storeId: string) {
  return `/api/v1/store/${encodeURIComponent(storeId)}/stock-adjustment`;
}

export const stockAdjustmentApi = {
  list: (storeId: string) =>
    Api.get<StockAdjustmentListResponse>(stockAdjustmentPath(storeId)).then(
      (response) => response.data,
    ),
  create: (storeId: string, body: CreateStockAdjustmentDto) =>
    Api.post<StockAdjustment>(stockAdjustmentPath(storeId), body).then(
      (response) => response.data,
    ),
};
