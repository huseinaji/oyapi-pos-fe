import type { Page, Route } from '@playwright/test';
import type { ApiUserRole } from '@/types/api';

export const STORE_ID = 'test-store';
export const CATEGORY_RAW_ID = 'category-raw';
export const CATEGORY_DESSERT_ID = 'category-dessert';
export const RAW_ITEM_ID = 'item-raw';
export const FINISHED_ITEM_ID = 'item-finished';
export const BUNDLE_ITEM_ID = 'item-bundle';

export type TestItem = {
  id: string;
  name: string;
  storeId: string;
  status: 'active' | 'inactive';
  categoryId: string | null;
  category: { name: string } | null;
  type: string;
  description: string | null;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  bin: { actualQty: number; reservedQty: number; uom: string } | null;
  itemComponents?:
    | {
        componentItemId: string;
        qty: number;
        componentItem?: {
          name: string;
          description: string | null;
          uom: string;
          sellingPrice: number;
        } | null;
      }[]
    | null;
};

function makeItem(
  id: string,
  name: string,
  type: string,
  categoryId: string | null,
  categoryName: string | null,
): TestItem {
  return {
    id,
    name,
    storeId: STORE_ID,
    status: 'active',
    categoryId,
    category: categoryName ? { name: categoryName } : null,
    type,
    description: `${name} description`,
    uom: 'pcs',
    basePrice: 1000,
    sellingPrice: 2000,
    isMaintainStock: type !== 'item_bundle',
    createdBy: 'test-user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    bin: { actualQty: 20, reservedQty: 2, uom: 'pcs' },
  };
}

export const TEST_ITEMS: TestItem[] = [
  makeItem(
    RAW_ITEM_ID,
    'adonan',
    'raw_material',
    CATEGORY_RAW_ID,
    'Bahan baku',
  ),
  makeItem(
    FINISHED_ITEM_ID,
    'croffle icecream',
    'finished_good',
    CATEGORY_DESSERT_ID,
    'Dessert',
  ),
  {
    ...makeItem(
      BUNDLE_ITEM_ID,
      'adonan filling',
      'item_bundle',
      CATEGORY_DESSERT_ID,
      'Dessert',
    ),
    itemComponents: [
      {
        componentItemId: FINISHED_ITEM_ID,
        qty: 2,
        componentItem: {
          name: 'croffle icecream',
          description: 'Croffle with ice cream',
          uom: 'pcs',
          sellingPrice: 2000,
        },
      },
    ],
  },
  ...Array.from({ length: 10 }, (_, index) =>
    makeItem(
      `item-extra-${index + 1}`,
      `Catalog item ${String(index + 1).padStart(2, '0')}`,
      'finished_good',
      CATEGORY_DESSERT_ID,
      'Dessert',
    ),
  ),
];

export const TEST_CATEGORIES = [
  {
    id: CATEGORY_RAW_ID,
    name: 'Bahan baku',
    storeId: STORE_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: CATEGORY_DESSERT_ID,
    name: 'Dessert',
    storeId: STORE_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `category-extra-${index + 1}`,
    name: `Test category ${String(index + 1).padStart(2, '0')}`,
    storeId: STORE_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
];

export type ApiMockOptions = {
  authenticated?: boolean;
  userHasStore?: boolean;
  userRole?: ApiUserRole;
  storeRole?: 'admin' | 'cashier';
  signupStatus?: number;
  loginStatus?: number;
  itemsStatus?: number;
  failFirstItemsRequest?: boolean;
  saveStatus?: number;
  posSessionOpen?: boolean;
  posProducts?: boolean;
  transactionCount?: number;
  transactionCreatedAt?: string;
};

export type CapturedWrite = {
  method: string;
  path: string;
  body: Record<string, unknown>;
};

function transactionDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function calendarDate(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

export async function installApiMocks(
  page: Page,
  options: ApiMockOptions = {},
): Promise<CapturedWrite[]> {
  let authenticated = options.authenticated ?? false;
  let selectedStoreId = options.userHasStore === false ? undefined : STORE_ID;
  let itemRequestCount = 0;
  const writes: CapturedWrite[] = [];
  const stores =
    options.userHasStore === false
      ? []
      : [
          {
            id: STORE_ID,
            name: 'Test store',
            imageUrl: null,
            address: null,
            phone: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            storeMember: [],
          },
        ];

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    const fulfill = (status: number, data: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });

    if (path === '/api/v1/auth/me' && method === 'GET') {
      if (!authenticated) {
        await fulfill(401, { statusCode: 401, message: 'Unauthorized' });
        return;
      }

      await fulfill(200, {
        userPayload: {
          sub: 'test-user',
          username: 'administrator',
          email: 'admin@example.test',
          role: options.userRole ?? 'ADMIN',
          status: 'ACTIVE',
          ...(selectedStoreId
            ? {
                store: {
                  storeId: selectedStoreId,
                  role:
                    options.storeRole ??
                    ((options.userRole ?? 'ADMIN') === 'ADMIN'
                      ? 'admin'
                      : 'cashier'),
                },
              }
            : {}),
        },
        rememberMe: false,
      });
      return;
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method, path, body });
      const status = options.signupStatus ?? 201;
      await fulfill(
        status,
        status >= 400
          ? { statusCode: status, message: 'Signup rejected by test mock' }
          : {
              id: 'new-user',
              username: body.username,
              email: body.email,
              role: 'USER',
              status: 'ACTIVE',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
      );
      return;
    }

    if (path === '/api/v1/auth/login' && method === 'POST') {
      const status = options.loginStatus ?? 201;
      if (status < 400) authenticated = true;
      await fulfill(
        status,
        status >= 400
          ? { statusCode: status, message: 'Invalid credentials' }
          : { message: 'Login successful' },
      );
      return;
    }

    if (path === '/api/v1/auth/logout' && method === 'POST') {
      authenticated = false;
      await fulfill(200, {});
      return;
    }

    if (path === '/api/v1/store/my-store' && method === 'GET') {
      await fulfill(200, {
        count: stores.length,
        rows: stores,
      });
      return;
    }

    if (path === '/api/v1/store' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method, path, body });
      const store = {
        id: 'created-store',
        ...body,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        storeMember: [],
      };
      stores.push(store);
      await fulfill(201, store);
      return;
    }

    const selectedStoreMatch = path.match(
      /^\/api\/v1\/store\/([^/]+)\/select$/,
    );
    if (selectedStoreMatch && method === 'POST') {
      selectedStoreId = selectedStoreMatch[1];
      await fulfill(200, {});
      return;
    }

    if (path === `/api/v1/store/${STORE_ID}/pos-session` && method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const status = url.searchParams.get('status');
      const sessions =
        options.posSessionOpen && (!status || status === 'active')
          ? [
              {
                id: 'test-pos-session',
                storeId: STORE_ID,
                status: 'active',
                createdAt: transactionDate(0),
                updatedAt: transactionDate(0),
                createdBy: 'test-user',
                closedAt: null,
                closedBy: null,
                items: [],
              },
            ]
          : [];
      await fulfill(200, {
        count: sessions.length,
        rows: sessions.slice((pageNumber - 1) * limit, pageNumber * limit),
      });
      return;
    }

    if (path === `/api/v1/store/${STORE_ID}/invoice` && method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const dateRange = url.searchParams.get('dateRange');
      const timezone = url.searchParams.get('timezone') ?? 'UTC';
      const invoices = Array.from(
        { length: options.transactionCount ?? 2 },
        (_, index) => {
          const daysAgo = index === 0 ? 0 : index;
          const suffix = daysAgo === 0 ? 'TODAY' : `DAY-${daysAgo}`;
          const createdAt =
            options.transactionCreatedAt ?? transactionDate(daysAgo);
          return {
            id: `transaction-${suffix.toLowerCase()}`,
            invoiceId: `INV-${suffix}`,
            storeId: STORE_ID,
            posSessionId: 'test-pos-session',
            customer: 'Walk-in Customer',
            paymentMethod: 'cash',
            totalAmount: 2000,
            status: 'complete',
            createdBy: 'test-user',
            updatedBy: 'test-user',
            createdAt,
            updatedAt: createdAt,
            deletedAt: null,
            salesInvoiceItems: [],
            creator: {
              id: 'test-user',
              username: 'administrator',
              email: 'admin@example.test',
              role: 'ADMIN',
              status: 'ACTIVE',
              lastLogin: createdAt,
            },
          };
        },
      );
      const today = calendarDate(new Date().toISOString(), timezone);
      const customStart = url.searchParams.get('startDate');
      const customEnd = url.searchParams.get('endDate');
      const dateFilteredInvoices = invoices.filter((invoice) => {
        const invoiceDate = calendarDate(invoice.createdAt, timezone);
        if (dateRange === 'today') return invoiceDate === today;
        if (dateRange === 'last30days') {
          const startDate = new Date(`${today}T00:00:00.000Z`);
          startDate.setUTCDate(startDate.getUTCDate() - 29);
          return (
            invoiceDate >= startDate.toISOString().slice(0, 10) &&
            invoiceDate <= today
          );
        }
        if (dateRange === 'custom' && customStart && customEnd) {
          return invoiceDate >= customStart && invoiceDate <= customEnd;
        }
        return true;
      });
      await fulfill(200, {
        count: dateFilteredInvoices.length,
        rows: dateFilteredInvoices.slice(
          (pageNumber - 1) * limit,
          pageNumber * limit,
        ),
      });
      return;
    }

    if (path.endsWith('/items/categories') && method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const start = (pageNumber - 1) * limit;
      await fulfill(200, {
        count: TEST_CATEGORIES.length,
        rows: TEST_CATEGORIES.slice(start, start + limit),
      });
      return;
    }

    if (path.match(/^\/api\/v1\/store\/[^/]+\/items$/) && method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const name = url.searchParams.get('name')?.toLowerCase();
      const categoryId = url.searchParams.get('categoryId');
      const type = url.searchParams.get('type');
      if (!type) itemRequestCount += 1;
      const matchingItems = TEST_ITEMS.filter(
        (item) =>
          (!name || item.name.toLowerCase().includes(name)) &&
          (!categoryId || item.categoryId === categoryId) &&
          (!type || item.type === type),
      );
      const status =
        options.failFirstItemsRequest && !type && itemRequestCount <= 4
          ? 500
          : (options.itemsStatus ?? 200);
      await fulfill(
        status,
        status >= 400
          ? { statusCode: status, message: 'Items unavailable' }
          : {
              count: matchingItems.length,
              rows: matchingItems.slice(
                (pageNumber - 1) * limit,
                pageNumber * limit,
              ),
            },
      );
      return;
    }

    if (path.endsWith(`/items/${BUNDLE_ITEM_ID}`) && method === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method, path, body });
      const status = options.saveStatus ?? 200;
      await fulfill(
        status,
        status >= 400
          ? { statusCode: status, message: 'Save rejected by test mock' }
          : { ...TEST_ITEMS[2], ...body },
      );
      return;
    }

    const itemId = path.match(/^\/api\/v1\/store\/[^/]+\/items\/([^/]+)$/)?.[1];
    if (itemId && method === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method, path, body });
      const item = TEST_ITEMS.find((testItem) => testItem.id === itemId);
      await fulfill(
        item ? 200 : 404,
        item
          ? { ...item, ...body }
          : { statusCode: 404, message: 'Item not found' },
      );
      return;
    }

    if (path.match(/^\/api\/v1\/store\/[^/]+\/items$/) && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method, path, body });
      await fulfill(201, { ...TEST_ITEMS[0], ...body });
      return;
    }

    if (path.endsWith('/transaction/sellable-item') && method === 'GET') {
      const sellableItems = options.posProducts
        ? TEST_ITEMS.filter((item) => item.type !== 'raw_material').map(
            (item) => ({
              id: item.id,
              storeId: item.storeId,
              name: item.name,
              imageUrl: null,
              status: item.status,
              type: item.type,
              description:
                item.id === BUNDLE_ITEM_ID
                  ? '2 croffle dibagi menjadi 5 + varian 5 rasa'
                  : 'test description',
              uom: item.uom,
              basePrice: item.basePrice,
              sellingPrice: item.sellingPrice,
              isMaintainStock: item.isMaintainStock,
              createdBy: item.createdBy,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              categoryId: item.categoryId,
              itemComponents: item.itemComponents ?? [],
              availableQty: item.bin?.actualQty ?? 0,
            }),
          )
        : [];
      await fulfill(200, sellableItems);
      return;
    }

    await fulfill(404, {
      statusCode: 404,
      message: `No test API mock for ${method} ${path}`,
    });
  });

  return writes;
}
