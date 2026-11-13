import { expect, test } from '@playwright/test';
import { installApiMocks, STORE_ID } from './fixtures';

test('assigns an existing platform user with the selected store role', async ({
  page,
}) => {
  await installApiMocks(page, {
    authenticated: true,
    storeRole: 'admin',
  });

  let assignedRequest: { path: string; body: Record<string, unknown> } | null =
    null;

  await page.route(`**/api/v1/store/${STORE_ID}/members`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, rows: [] }),
    });
  });
  await page.route('**/api/v1/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        count: 1,
        rows: [
          {
            id: 'existing-user-id',
            username: 'jane.cashier',
            email: 'jane@example.test',
            role: 'USER',
            status: 'ACTIVE',
            lastLogin: null,
          },
        ],
      }),
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
  await page.getByRole('button', { name: 'Add member' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'Add store member' });
  await dialog.getByLabel('Platform username').fill('jane.cashier');
  const usernameInput = dialog.getByRole('combobox', {
    name: 'Platform username',
  });
  const roleSelect = dialog.getByRole('combobox', { name: 'Store Role' });
  const [usernameBox, roleBox] = await Promise.all([
    usernameInput.boundingBox(),
    roleSelect.boundingBox(),
  ]);
  if (!usernameBox || !roleBox) {
    throw new Error('Both assignment fields should have a visible size.');
  }
  expect(Math.abs(usernameBox.height - roleBox.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(usernameBox.width - roleBox.width)).toBeLessThanOrEqual(1);
  await expect(roleSelect).toContainText('cashier');
  await roleSelect.click();
  const roleOptions = page.getByRole('listbox');
  await expect(roleOptions).toBeVisible();
  const [triggerBox, optionsBox] = await Promise.all([
    roleSelect.boundingBox(),
    roleOptions.boundingBox(),
  ]);
  if (!triggerBox || !optionsBox) {
    throw new Error('The store role dropdown should have a visible size.');
  }
  expect(Math.abs(optionsBox.x - triggerBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(optionsBox.width - triggerBox.width)).toBeLessThanOrEqual(2);
  expect(optionsBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
  await page.getByRole('option', { name: 'Admin' }).click();
  await dialog.getByRole('button', { name: 'Add member' }).click();

  await expect
    .poll(() => assignedRequest)
    .toEqual({
      path: `/api/v1/store/${STORE_ID}/assign`,
      body: { userId: 'existing-user-id', role: 'admin' },
    });
});
