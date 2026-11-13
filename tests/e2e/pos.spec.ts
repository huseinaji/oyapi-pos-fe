import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures';

test('shows product counts in scrollable category filters', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen: true,
    posProducts: true,
  });
  await page.goto('/pos');

  const allCategory = page.getByRole('button', { name: 'All (12 products)' });
  const dessertCategory = page.getByRole('button', {
    name: 'Dessert (12 products)',
  });

  await expect(allCategory).toBeVisible();
  await expect(allCategory).toHaveAttribute('aria-pressed', 'true');
  await expect(dessertCategory).toBeVisible();
  await dessertCategory.click();
  await expect(dessertCategory).toHaveAttribute('aria-pressed', 'true');
  await expect(allCategory).toHaveAttribute('aria-pressed', 'false');
});

test('aligns Add to cart buttons at the bottom of product cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen: true,
    posProducts: true,
  });
  await page.goto('/pos');

  const bundleCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: 'adonan filling' });
  const itemCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: 'croffle icecream' });
  const bundleButton = bundleCard.getByRole('button', { name: 'Add to cart' });
  const itemButton = itemCard.getByRole('button', { name: 'Add to cart' });

  await expect(bundleButton).toBeVisible();
  await expect(itemButton).toBeVisible();

  const [bundleBox, itemBox] = await Promise.all([
    bundleButton.boundingBox(),
    itemButton.boundingBox(),
  ]);
  expect(bundleBox).not.toBeNull();
  expect(itemBox).not.toBeNull();
  expect(
    Math.abs(bundleBox!.y + bundleBox!.height - itemBox!.y - itemBox!.height),
  ).toBeLessThanOrEqual(1);
});

test('animates the current order drawer when tapped open and closed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen: true,
    posProducts: true,
  });
  await page.goto('/pos');

  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  const drawer = page.getByTestId('current-order-drawer');
  const collapsedHeight = (await drawer.boundingBox())!.height;
  const currentOrder = page.getByRole('button', { name: /Current order/ });
  await currentOrder.click();
  const drawerPaymentStep = page.getByText('Payment', { exact: true }).last();
  await expect(drawerPaymentStep).toBeVisible();
  await expect
    .poll(async () => (await drawer.boundingBox())!.height)
    .toBeGreaterThan(collapsedHeight * 3);
  await expect(page.getByText('adonan filling', { exact: true })).toBeVisible();
  await currentOrder.click();
  await expect
    .poll(async () => (await drawer.boundingBox())!.height)
    .toBeLessThan(collapsedHeight + 2);
  await expect(currentOrder).toBeVisible();
  await currentOrder.click();
  await expect(drawerPaymentStep).toBeVisible();
  await currentOrder.click();
  await expect
    .poll(async () => (await drawer.boundingBox())!.height)
    .toBeLessThan(collapsedHeight + 2);
  await expect
    .poll(async () => (await drawer.boundingBox())!.height)
    .toBeLessThan(collapsedHeight + 2);
});

test('confirms a placed transaction and offers its receipt for printing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen: true,
    posProducts: true,
  });

  const createdAt = '2026-11-04T08:00:00.000Z';
  const transaction = {
    id: 'transaction-new',
    invoiceId: 'INV-NEW-1',
    storeId: 'test-store',
    posSessionId: 'test-pos-session',
    customer: 'Walk-in Customer',
    paymentMethod: 'qris',
    totalAmount: 2000,
    status: 'complete',
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    salesInvoiceItems: [],
  };
  let createRequestBody: Record<string, unknown> | null = null;

  await page.route('**/api/v1/store/test-store/transaction', async (route) => {
    createRequestBody = route.request().postDataJSON() as Record<
      string,
      unknown
    >;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(transaction),
    });
  });
  await page.route(
    '**/api/v1/store/test-store/invoice/transaction-new',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(transaction),
      });
    },
  );

  await page.goto('/pos');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('button', { name: /Current order/ }).click();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.locator('button').filter({ hasText: 'qris' }).click();
  await page.getByRole('button', { name: 'Review order' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();

  const successDialog = page.getByRole('dialog', {
    name: 'Transaction successful',
  });
  await expect(successDialog).toBeVisible();
  await expect(
    successDialog.getByText('INV-NEW-1', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => createRequestBody)
    .toMatchObject({
      customer: 'Walk-in Customer',
      paymentMethod: 'qris',
      items: [{ itemId: expect.any(String), qty: 1 }],
    });

  await successDialog.getByRole('button', { name: 'Print receipt' }).click();
  await expect(page).toHaveURL('/transactions/print/transaction-new');
  await expect(page.getByRole('heading', { name: 'POS Studio' })).toBeVisible();
  await expect(page.getByText('INV-NEW-1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
});
