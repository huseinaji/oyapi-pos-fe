import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures';

test('opens a token storefront and supports a local checkout preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const writes = await installApiMocks(page);
  await page.goto('/storefront?token=DEMO-TOKEN');

  await expect(
    page.getByRole('heading', { name: 'Kopi & Dapur Senja' }),
  ).toBeVisible();
  const categoryNavigation = page.getByRole('navigation', {
    name: 'Kategori menu',
  });
  const categoryNavMetrics = await categoryNavigation.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(categoryNavMetrics.scrollWidth).toBe(categoryNavMetrics.clientWidth);
  for (const category of [
    'Semua',
    'Kopi & Espresso',
    'Non-Kopi',
    'Makanan Berat',
    'Pastry & Snack',
  ]) {
    await expect(
      categoryNavigation.getByRole('button', { name: category, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: 'Tambah Almond Butter Croissant' }),
  ).toBeDisabled();

  await page.getByRole('button', { name: 'Pastry & Snack' }).click();
  const croissantCard = page.locator(
    '[data-slot="card"][aria-label="Almond Butter Croissant"]',
  );
  await expect(croissantCard).toBeVisible();
  await expect(
    page.locator('[data-slot="card"][aria-label="Kopi Susu Gula Aren"]'),
  ).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Cari menu' }).fill('parmesan');
  await expect(
    page.locator('[data-slot="card"][aria-label="Parmesan Herb Fries"]'),
  ).toBeVisible();
  await expect(croissantCard).toHaveCount(0);

  await page.getByRole('button', { name: 'Semua' }).click();
  await page.getByRole('searchbox', { name: 'Cari menu' }).fill('');
  const coffeeCard = page.locator(
    '[data-slot="card"][aria-label="Kopi Susu Gula Aren"]',
  );
  await coffeeCard
    .getByRole('button', { name: 'Detail menu: Kopi Susu Gula Aren' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Kopi Susu Gula Aren' }),
  ).toBeVisible();
  const mobileDetailSheet = page.locator('[data-slot="drawer-popup"]');
  await page.waitForTimeout(400);
  const mobileDetailSheetBox = await mobileDetailSheet.boundingBox();
  expect(mobileDetailSheetBox).not.toBeNull();
  if (!mobileDetailSheetBox) {
    throw new Error('Mobile menu details sheet must be visible');
  }
  expect(mobileDetailSheetBox.x).toBe(0);
  expect(mobileDetailSheetBox.y + mobileDetailSheetBox.height).toBe(844);
  await page.getByLabel('Catatan untuk menu').fill('Less sugar');
  await page.getByRole('button', { name: 'Tambah jumlah menu' }).click();
  await page.getByRole('button', { name: 'Simpan ke keranjang' }).click();

  await page.getByRole('button', { name: /Buka keranjang/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Keranjang Anda' }),
  ).toBeVisible();
  await expect(page.getByLabel('Catatan Kopi Susu Gula Aren')).toHaveValue(
    'Less sugar',
  );
  await page.getByRole('button', { name: 'Lanjut ke data pemesan' }).click();

  await expect(
    page.getByRole('heading', { name: 'Data pemesan' }),
  ).toBeVisible();
  await expect(page.getByLabel('Kode pesanan')).toHaveValue('DEMO-TOKEN');
  await page.getByLabel('Nama pemesan').fill('Nia');
  await page.getByRole('button', { name: 'Lihat simulasi' }).click();
  await expect(
    page.getByRole('status').getByText(/Pesanan belum dikirim atau disimpan/),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
});

test('aligns the desktop search, categories, and menu cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installApiMocks(page);
  await page.goto('/storefront?token=DEMO-TOKEN');

  const searchBox = await page.getByRole('searchbox').boundingBox();
  const categories = await page
    .getByRole('navigation', { name: 'Kategori menu' })
    .boundingBox();
  expect(searchBox).not.toBeNull();
  expect(categories).not.toBeNull();
  if (!searchBox || !categories) {
    throw new Error('Storefront search and category controls must be visible');
  }
  expect(searchBox.width).toBe(320);
  expect(Math.abs(searchBox.y - categories.y)).toBeLessThan(2);

  const firstCard = page.locator(
    '[data-slot="card"][aria-label="Kopi Susu Gula Aren"]',
  );
  const secondCard = page.locator(
    '[data-slot="card"][aria-label="Espresso Tonic Orange"]',
  );
  const firstCardBox = await firstCard.boundingBox();
  const secondCardBox = await secondCard.boundingBox();
  const imageBox = await firstCard.locator('img').boundingBox();
  const titleBox = await firstCard
    .getByRole('button', { name: 'Detail menu: Kopi Susu Gula Aren' })
    .boundingBox();
  expect(firstCardBox).not.toBeNull();
  expect(secondCardBox).not.toBeNull();
  if (!firstCardBox || !secondCardBox || !imageBox || !titleBox) {
    throw new Error('Storefront cards must be visible in the desktop grid');
  }
  expect(imageBox.x).toBe(firstCardBox.x + 1);
  expect(imageBox.y).toBe(firstCardBox.y + 1);
  expect(imageBox.y + imageBox.height).toBe(
    firstCardBox.y + firstCardBox.height - 1,
  );
  expect(titleBox.x - (imageBox.x + imageBox.width)).toBe(32);
  expect(secondCardBox.x).toBeGreaterThan(firstCardBox.x);
  expect(Math.abs(firstCardBox.y - secondCardBox.y)).toBeLessThan(2);

  await firstCard
    .getByRole('button', { name: 'Detail menu: Kopi Susu Gula Aren' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Kopi Susu Gula Aren' }),
  ).toBeVisible();
  const desktopDetailSheet = page.locator('[data-slot="drawer-popup"]');
  await page.waitForTimeout(400);
  const desktopDetailSheetBox = await desktopDetailSheet.boundingBox();
  expect(desktopDetailSheetBox).not.toBeNull();
  if (!desktopDetailSheetBox) {
    throw new Error('Desktop menu details sheet must be visible');
  }
  expect(desktopDetailSheetBox.x + desktopDetailSheetBox.width).toBe(1280);
  expect(desktopDetailSheetBox.y).toBe(0);
  expect(desktopDetailSheetBox.height).toBe(900);
});

test('keeps every category selectable at medium widths', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await installApiMocks(page);
  await page.goto('/storefront?token=DEMO-TOKEN');

  const categoryNavigation = page.getByRole('navigation', {
    name: 'Kategori menu',
  });
  const categoryNavMetrics = await categoryNavigation.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(categoryNavMetrics.scrollWidth).toBe(categoryNavMetrics.clientWidth);

  const pastryCategory = categoryNavigation.getByRole('button', {
    name: 'Pastry & Snack',
    exact: true,
  });
  await expect(pastryCategory).toBeVisible();
  await pastryCategory.click();
  await expect(
    page.locator('[data-slot="card"][aria-label="Almond Butter Croissant"]'),
  ).toBeVisible();
});

test('shows storefront navigation only to store admins', async ({ page }) => {
  await installApiMocks(page, { authenticated: true });
  await page.goto('/products');

  const storefrontLink = page.getByRole('link', { name: 'Storefront' });
  await expect(storefrontLink).toBeVisible();
  await storefrontLink.click();

  await expect(page).toHaveURL('/storefront');
  await expect(
    page.getByRole('heading', { name: 'Kopi & Dapur Senja' }),
  ).toBeVisible();
  await expect(page.locator('[data-sidebar="sidebar"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Profile menu' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'Panel POS' })).toBeVisible();
});

test('redirects a cashier from the admin storefront route', async ({
  page,
}) => {
  await installApiMocks(page, {
    authenticated: true,
    userRole: 'CASHIER',
  });
  await page.goto('/storefront');

  await expect(page).toHaveURL('/cashier-sessions');
  await expect(page.getByRole('link', { name: 'Storefront' })).toHaveCount(0);
});
