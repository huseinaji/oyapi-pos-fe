import { Api } from '../api';
import { fetchAllPages, type PaginatedResponse } from '@/lib/api/pagination';
import type {
  CashierOperator,
  CashierSession,
  CashierStockSnapshot,
  OpenCashierSessionDto,
} from './cashier-sessions-types';

type PosSessionItemResponse = {
  itemId: string;
  openingQty: number;
  soldQty: number;
  closingQty: number;
  item: {
    id: string;
    name: string;
    description: string;
    uom: string;
    sellingPrice: number;
    type: string;
    isMaintainStock: boolean;
    bin: {
      actualQty: number;
      reservedQty: number;
      uom: string;
    } | null;
  };
};

export type PosSessionResponse = {
  id: string;
  storeId: string;
  store: {
    name: string;
    imageUrl: string | null;
    address: string | null;
    phone: string | null;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  closedAt: string | null;
  closedBy: string | null;
  items: PosSessionItemResponse[];
};

type PosSessionFilters = {
  createdBy?: string;
  status?: 'active' | 'closed';
  closedBy?: string;
};

function sessionsPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/pos-session`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function mapOperator(value: unknown): CashierOperator {
  const raw = asRecord(value);
  const id = raw.id ?? raw.userId ?? raw.sub ?? value;
  return {
    userId: typeof id === 'string' || typeof id === 'number' ? String(id) : '',
    username: String(raw.username ?? raw.name ?? raw.email ?? 'Cashier'),
  };
}

function mapSnapshot(
  item: PosSessionItemResponse,
  quantity: number,
): CashierStockSnapshot {
  return {
    itemId: String(item.itemId),
    itemName: item.item?.name ?? String(item.itemId),
    uom: item.item?.uom ?? '',
    quantity,
    ...(typeof item.soldQty === 'number' ? { soldQuantity: item.soldQty } : {}),
  };
}

function mapSession(value: PosSessionResponse): CashierSession {
  const items = value.items;
  const openingStock = items.map((item) => mapSnapshot(item, item.openingQty));
  const isClosed = value.status.toLowerCase() === 'closed';
  const closingStock = isClosed
    ? items.flatMap((item) =>
        typeof item.closingQty === 'number'
          ? [mapSnapshot(item, item.closingQty)]
          : [],
      )
    : undefined;

  return {
    id: value.id,
    storeId: value.storeId,
    status: isClosed ? 'CLOSED' : 'OPEN',
    openedAt: value.createdAt,
    openedBy: mapOperator(value.createdBy),
    openingStock,
    ...(value.closedAt ? { closedAt: value.closedAt } : {}),
    ...(value.closedBy ? { closer: mapOperator(value.closedBy) } : {}),
    ...(closingStock ? { closingStock } : {}),
  };
}

export const cashierSessionsApi = {
  list: async (storeId: string, filters: PosSessionFilters = {}) => {
    const response = await fetchAllPages((page, limit) =>
      Api.get<PaginatedResponse<PosSessionResponse>>(sessionsPath(storeId), {
        params: { ...filters, page, limit },
      }).then((result) => result.data),
    );
    return response.rows.map(mapSession);
  },
  open: (storeId: string, openingStock: CashierStockSnapshot[]) => {
    const body: OpenCashierSessionDto = {
      items: openingStock.map(({ itemId, quantity }) => ({
        itemId,
        openingQty: quantity,
      })),
    };

    return Api.post<void>(sessionsPath(storeId), body).then(
      (response) => response.data,
    );
  },
  close: (storeId: string) =>
    Api.delete<void>(sessionsPath(storeId)).then((response) => response.data),
};
