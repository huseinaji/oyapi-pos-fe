import { expect, test } from '@playwright/test';
import { installApiMocks, STORE_ID, TEST_ITEMS } from './fixtures';

async function openSessionDetails(
  page: Parameters<typeof installApiMocks>[0],
  viewport?: { width: number; height: number },
  itemCount = 1,
) {
  if (viewport) await page.setViewportSize(viewport);
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen: true,
  });

  let closed = false;
  const session = {
    id: 'test-pos-session',
    storeId: STORE_ID,
    store: {
      name: 'Test store',
      imageUrl: null,
      address: null,
      phone: null,
    },
    status: 'active',
    createdAt: '2026-11-03T08:00:00.000Z',
    updatedAt: '2026-11-03T08:00:00.000Z',
    createdBy: { id: 'test-user', username: 'administrator' },
    closedAt: null as string | null,
    closedBy: null as { id: string; username: string } | null,
    items: Array.from({ length: itemCount }, (_, index) => {
      const item =
        index === 0
          ? TEST_ITEMS[0]
          : {
              ...TEST_ITEMS[0],
              id: `test-item-${index + 1}`,
              name: `session item ${index + 1}`,
            };

      return {
        itemId: item.id,
        openingQty: 20 + index,
        soldQty: 3,
        closingQty: 17 + index,
        item,
      };
    }),
  };

  await page.route(
    `**/api/v1/store/${STORE_ID}/pos-session*`,
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'DELETE') {
        closed = true;
        session.status = 'closed';
        session.closedAt = '2026-11-03T10:00:00.000Z';
        session.closedBy = { id: 'test-user', username: 'administrator' };
        await route.fulfill({ status: 200, json: {} });
        return;
      }

      const requestedStatus = url.searchParams.get('status');
      const shouldInclude =
        !requestedStatus ||
        (requestedStatus === 'active' && !closed) ||
        (requestedStatus === 'closed' && closed);
      const rows = shouldInclude ? [session] : [];
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      await route.fulfill({
        status: 200,
        json: {
          count: rows.length,
          rows: rows.slice((pageNumber - 1) * limit, pageNumber * limit),
        },
      });
    },
  );

  await page.goto('/cashier-sessions');
  await expect(
    page.getByRole('heading', { name: 'Cashier sessions', exact: true }),
  ).toBeVisible();
}

test.describe('Cashier session detail drawer', () => {
  test('opens the closing count dialog directly from the active session', async ({
    page,
  }) => {
    await openSessionDetails(page);
    await page.getByRole('button', { name: 'Close cashier' }).click();

    await expect(
      page.getByRole('heading', { name: 'Count closing stock and cash' }),
    ).toBeVisible();
    await expect(page.locator('[data-slot="drawer-popup"]')).toHaveCount(0);
    await expect(page.getByLabel('Real stock count for adonan')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('heading', { name: 'Count closing stock and cash' }),
    ).toHaveCount(0);
    await expect(page.locator('[data-slot="drawer-popup"]')).toHaveCount(0);
  });

  test('records mock stock and cash counts before closing the session', async ({
    page,
  }) => {
    await openSessionDetails(page);
    await page.getByRole('button', { name: 'Close cashier' }).click();

    await expect(
      page.getByRole('heading', { name: 'Count closing stock and cash' }),
    ).toBeVisible();
    await expect(page.locator('[data-slot="drawer-popup"]')).toHaveCount(0);
    await expect(
      page.getByLabel('Real cash counted for the session'),
    ).toBeVisible();
    await page.getByLabel('Real stock count for adonan').first().fill('15');
    await page.getByLabel('Real cash counted for the session').fill('12000');
    await page.getByRole('button', { name: 'Review counts' }).click();
    await expect(
      page.getByRole('heading', { name: 'Review and confirm close' }),
    ).toBeVisible();
    await expect(page.getByText('12.000')).toBeVisible();
    await expect(page.getByText('Cashier closed')).toHaveCount(0);
    await page.getByRole('button', { name: 'Confirm close session' }).click();

    await expect(
      page.getByText(/Physical counts are stored as mock data/),
    ).toBeVisible();
    await page.getByRole('row').filter({ hasText: 'administrator' }).click();
    await expect(
      page.getByText('15 pcs', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('-2 pcs short', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/12\.000/)).toBeVisible();
    await expect(page.getByText('Mock value').first()).toBeVisible();
  });

  test('requires a physical count and cash amount before closing', async ({
    page,
  }) => {
    await openSessionDetails(page);
    await page.getByRole('button', { name: 'Close cashier' }).click();
    await page.getByRole('button', { name: 'Review counts' }).click();
    await expect(
      page.getByText('Enter a valid real stock count for adonan.'),
    ).toBeVisible();

    await page.getByLabel('Real stock count for adonan').first().fill('15');
    await page.getByRole('button', { name: 'Review counts' }).click();
    await expect(
      page.getByText('Enter the actual cash counted before closing.'),
    ).toBeVisible();

    await page.getByLabel('Real cash counted for the session').fill('12000');
    await page.getByRole('button', { name: 'Review counts' }).click();
    await page.getByRole('button', { name: 'Edit counts' }).click();
    await expect(
      page.getByLabel('Real stock count for adonan').first(),
    ).toHaveValue('15');
    await expect(
      page.getByLabel('Real cash counted for the session'),
    ).toHaveValue('12000');
  });

  test('presents the detail drawer from the bottom on mobile', async ({
    page,
  }) => {
    await openSessionDetails(page, { width: 390, height: 844 });
    await page
      .getByRole('row')
      .filter({ hasText: 'administrator' })
      .filter({ visible: true })
      .click();

    await expect(page.locator('[data-slot="drawer-popup"]')).toHaveAttribute(
      'data-swipe-direction',
      'down',
    );
    const itemList = page.locator('ul.space-y-2').filter({ hasText: 'adonan' });
    await expect(itemList.getByText('Opening', { exact: true })).toBeVisible();
    await expect(itemList.getByText('20 pcs', { exact: true })).toBeVisible();
    await expect(itemList.getByText('Sold', { exact: true })).toBeVisible();
    await expect(itemList.getByText('3 pcs', { exact: true })).toBeVisible();
    await expect(itemList.getByText('Expected', { exact: true })).toBeVisible();
    await expect(itemList.getByText('17 pcs', { exact: true })).toBeVisible();
    await itemList.scrollIntoViewIfNeeded();
    await expect(
      page.getByLabel('Real cash counted for the session'),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Close session' }).click();
    await expect(
      page.getByRole('heading', { name: 'Count closing stock and cash' }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Real cash counted for the session'),
    ).toBeVisible();
  });

  test('keeps the drawer mounted until its closing transition finishes', async ({
    page,
  }) => {
    await openSessionDetails(page);
    await page
      .getByRole('row')
      .filter({ hasText: 'administrator' })
      .filter({ visible: true })
      .click();

    const drawer = page.locator('[data-slot="drawer-popup"]');
    await expect(drawer).toBeVisible();
    await page
      .getByRole('button', { name: 'Close cashier session details' })
      .click();

    await expect(drawer).toHaveAttribute('data-ending-style', '');
    await expect(drawer).toBeHidden();
  });

  test('searches and paginates large session item lists and closing counts', async ({
    page,
  }) => {
    await openSessionDetails(page, undefined, 7);
    await page
      .getByRole('row')
      .filter({ hasText: 'administrator' })
      .filter({ visible: true })
      .click();

    await expect(
      page.getByText('Showing 1–5 of 7 matching items'),
    ).toBeVisible();
    await expect(page.getByText('session item 6')).toHaveCount(0);
    await page.getByLabel('Search session items').fill('session item 7');
    await expect(
      page.getByText('Showing 1–1 of 1 matching items'),
    ).toBeVisible();
    await expect(
      page.getByText('session item 7').filter({ visible: true }),
    ).toBeVisible();
    await page.getByLabel('Search session items').fill('no matching item');
    await expect(
      page.getByText('No session items match “no matching item”.'),
    ).toBeVisible();

    await page.getByLabel('Search session items').fill('');
    await page.getByRole('button', { name: 'Next session items' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(
      page.getByText('session item 6').filter({ visible: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Close session' }).click();
    const countDialog = page.getByRole('dialog', {
      name: 'Count closing stock and cash',
    });
    await expect(
      countDialog.getByText('0 of 7 items counted', { exact: true }),
    ).toBeVisible();
    await expect(
      countDialog.getByLabel('Real stock count for adonan'),
    ).toBeVisible();
    await expect(
      countDialog.getByLabel('Real stock count for session item 5'),
    ).toBeVisible();
    await expect(
      countDialog.getByLabel('Real stock count for session item 6'),
    ).toHaveCount(0);

    await countDialog
      .getByLabel('Search items to count')
      .fill('no matching item');
    await expect(
      countDialog.getByText('No session items match “no matching item”.'),
    ).toBeVisible();
    await countDialog
      .getByLabel('Search items to count')
      .fill('session item 7');
    await countDialog
      .getByLabel('Real stock count for session item 7')
      .fill('27');
    await expect(
      countDialog.getByText('1 of 7 items counted', { exact: true }),
    ).toBeVisible();
    await countDialog.getByLabel('Search items to count').fill('');
    await countDialog
      .getByRole('button', { name: 'Next session items' })
      .click();
    await countDialog
      .getByLabel('Real stock count for session item 6')
      .fill('26');
    await countDialog.getByRole('button', { name: 'Review counts' }).click();

    await expect(
      countDialog.getByText('Enter a valid real stock count for adonan.'),
    ).toBeVisible();
    await expect(countDialog.getByText('Page 1 of 2')).toBeVisible();
  });

  test('keeps large session item lists usable on mobile', async ({ page }) => {
    await openSessionDetails(page, { width: 390, height: 844 }, 7);
    await page
      .getByRole('row')
      .filter({ hasText: 'administrator' })
      .filter({ visible: true })
      .click();

    await expect(
      page.getByText('Showing 1–5 of 7 matching items'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next session items' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(
      page.getByText('session item 6').filter({ visible: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Close session' }).click();
    const countDialog = page.getByRole('dialog', {
      name: 'Count closing stock and cash',
    });
    await expect(
      countDialog.getByLabel('Real stock count for session item 6'),
    ).toHaveCount(0);
    await countDialog
      .getByRole('button', { name: 'Next session items' })
      .click();
    await expect(
      countDialog.getByLabel('Real stock count for session item 6'),
    ).toBeVisible();
  });
});
