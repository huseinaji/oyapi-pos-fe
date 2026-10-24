import type { ItemFilterParams } from '@/types/api';

// ---------------------------------------------------------------------------
// Item (Product)
// ---------------------------------------------------------------------------

export type ApiItemBin = {
  actualQty: number;
  reservedQty: number;
  uom: string;
};

export type ItemFilters = Omit<ItemFilterParams, 'page' | 'limit'>;

export type ApiItemCategory = {
  name: string;
};

/** Shape of a single item returned by the API */
export type ApiItem = {
  id: string;
  name: string;
  storeId: string;
  status: 'active' | 'inactive';
  imageUrl?: string | null;
  categoryId: string | null;
  category: ApiItemCategory | null;
  type: string;
  description: string | null;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  bin: ApiItemBin | null;
  itemComponents: unknown[];
};

/** GET /api/v1/store/{storeId}/items — list response */
export type ItemListResponse = {
  count: number;
  rows: ApiItem[];
};

export type SellableItemResponse = {
  id: string;
  storeId: string;
  name: string;
  imageUrl?: string | null;
  status: 'active' | 'inactive';
  type: string;
  description: string | null;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryId: string | null;
  itemComponents: unknown[];
  availableQty: number;
};

export type StoreItemCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  storeId: string;
};

export type CreateStoreItemCategoryDto = {
  name: string;
};

export type StoreItemCategoryListResponse = {
  count: number;
  rows: StoreItemCategory[];
};

/** POST /api/v1/store/{storeId}/items — request body */
export type CreateItemDto = {
  name: string;
  imageUrl?: string;
  type: string;
  uom: string;
  categoryId?: string;
  description?: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock?: boolean;
  initialStock?: number;
  itemComponents?: ItemBundleComponentDto[];
};

export type ItemBundleComponentDto = {
  componentItemId: string;
  qty: number;
};

/** PATCH /api/v1/store/{storeId}/items/{itemId} — request body */
export type UpdateItemDto = Partial<
  Pick<
    CreateItemDto,
    | 'name'
    | 'categoryId'
    | 'description'
    | 'uom'
    | 'basePrice'
    | 'sellingPrice'
    | 'imageUrl'
  >
> & {
  status?: 'active' | 'inactive';
};

/** Enum values accepted by the backend for item type */
export const ITEM_TYPE_OPTIONS = [
  'raw_material',
  'finished_good',
  'item_bundle',
] as const;
export type ItemType = (typeof ITEM_TYPE_OPTIONS)[number];

/** Display labels for item types */
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
  item_bundle: 'Item Bundle',
};

/** Enum values accepted by the backend for item unit of measure */
export const ITEM_UOM_OPTIONS = ['pcs', 'box', 'kg'] as const;
export type ItemUom = (typeof ITEM_UOM_OPTIONS)[number];

/** Display labels for item UOM */
export const ITEM_UOM_LABELS: Record<ItemUom, string> = {
  pcs: 'Pieces',
  box: 'Box',
  kg: 'Kilogram',
};
