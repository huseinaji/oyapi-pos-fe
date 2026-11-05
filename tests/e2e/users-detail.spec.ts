import { expect, test } from '@playwright/test';
import { installApiMocks, STORE_ID } from './fixtures';

test('centers the mobile member drawer and disables only the store membership', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, {
    authenticated: true,
    storeRole: 'admin',
  });

  const member = {
    id: 'store-member-1',
    storeId: STORE_ID,
    userId: 'member-user-1',
    role: 'cashier',
    status: 'active',
    isDefault: false,
    createdAt: '2026-10-25T05:09:00.000Z',
    updatedAt: '2026-10-26T02:11:00.000Z',
    user: {
      id: 'member-user-1',
      username: 'cashier-one',
      email: 'cashier@example.test',
      role: 'USER',
      status: 'ACTIVE',
      lastLogin: null,
    },
  };
  let disabledRequest: { path: string; body: Record<string, unknown> } | null =
    null;

  await page.route(`**/api/v1/store/${STORE_ID}/members`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 1, rows: [member] }),
    });
  });
  await page.route(`**/api/v1/store/${STORE_ID}/disable`, async (route) => {
    const request = route.request();
    disabledRequest = {
      path: new URL(request.url()).pathname,
      body: request.postDataJSON() as Record<string, unknown>,
    };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Store members', exact: true }),
  ).toBeVisible();
  await page
    .getByText('cashier-one', { exact: true })
    .filter({ visible: true })
    .click();

  const drawer = page.locator('[data-slot="drawer-popup"]').filter({
    hasText: 'Store member',
  });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole('button', { name: 'More member actions' }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await drawer.boundingBox();
      return Math.abs((bounds?.y ?? 0) - 422);
    })
    .toBeLessThan(2);
  await expect
    .poll(async () => {
      const bounds = await drawer.boundingBox();
      return Math.abs((bounds?.y ?? 0) + (bounds?.height ?? 0) - 844);
    })
    .toBeLessThan(2);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await drawer.getByRole('button', { name: 'More member actions' }).click();
  await page.getByRole('menuitem', { name: 'Copy user ID' }).click();
  await expect(page.getByText('User ID copied')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('member-user-1');

  await drawer.getByRole('button', { name: 'Disable member' }).click();
  const disableDialog = page.getByRole('dialog', {
    name: 'Disable this member?',
  });
  await expect(disableDialog).toBeVisible();
  await expect(drawer).toBeVisible();
  await disableDialog.getByRole('button', { name: 'Confirm disable' }).click();

  await expect
    .poll(() => disabledRequest)
    .toEqual({
      path: `/api/v1/store/${STORE_ID}/disable`,
      body: { userId: 'member-user-1' },
    });

  await expect(drawer).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('table:visible').getByText('cashier-one').click();
  await expect(drawer).toHaveAttribute('data-swipe-direction', 'right');
  await expect
    .poll(async () => {
      const bounds = await drawer.boundingBox();
      return Math.abs((bounds?.x ?? 0) + (bounds?.width ?? 0) - 1280);
    })
    .toBeLessThan(2);
});

test('enables an inactive member through the store assign endpoint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, {
    authenticated: true,
    storeRole: 'admin',
  });

  const member = {
    id: 'store-member-inactive',
    storeId: STORE_ID,
    userId: 'inactive-member-user',
    role: 'cashier',
    status: 'inactive',
    isDefault: false,
    createdAt: '2026-10-25T05:09:00.000Z',
    updatedAt: '2026-10-26T02:11:00.000Z',
    user: {
      id: 'inactive-member-user',
      username: 'inactive-cashier',
      email: 'inactive@example.test',
      role: 'USER',
      status: 'ACTIVE',
      lastLogin: null,
    },
  };
  let assignedRequest: { path: string; body: Record<string, unknown> } | null =
    null;

  await page.route(`**/api/v1/store/${STORE_ID}/members`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 1, rows: [member] }),
    });
  });
  await page.route(`**/api/v1/store/${STORE_ID}/assign`, async (route) => {
    assignedRequest = {
      path: new URL(route.request().url()).pathname,
      body: route.request().postDataJSON() as Record<string, unknown>,
    };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: '{}',
    });
  });

  await page.goto('/users');
  await page
    .locator('table:visible')
    .getByText('inactive-cashier', { exact: true })
    .click();

  const drawer = page.locator('[data-slot="drawer-popup"]').filter({
    hasText: 'Store member',
  });
  await expect(drawer.getByText('Inactive', { exact: true })).toBeVisible();
  await expect(
    drawer.getByText(
      'This member is inactive and no longer has access to this store.',
    ),
  ).toBeVisible();
  await expect(
    drawer.getByRole('button', { name: 'Disable member' }),
  ).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Enable member' }).click();
  const enableDialog = page.getByRole('dialog', {
    name: 'Enable this member?',
  });
  await expect(enableDialog).toBeVisible();
  await expect(drawer).toBeVisible();
  await enableDialog.getByRole('button', { name: 'Confirm enable' }).click();
  await expect
    .poll(() => assignedRequest)
    .toEqual({
      path: `/api/v1/store/${STORE_ID}/assign`,
      body: { userId: 'inactive-member-user' },
    });
  await expect(drawer).toBeHidden();
});
