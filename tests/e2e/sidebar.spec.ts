import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures';

test('opens inventory pages from the collapsed sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installApiMocks(page, { authenticated: true });
  await page.goto('/products');
  await expect(
    page.getByRole('heading', { name: 'Items', exact: true }).last(),
  ).toBeVisible();
  const inventoryToggle = page.getByRole('button', {
    name: 'Toggle Inventory navigation',
  });
  await expect(inventoryToggle).toBeVisible();
  await inventoryToggle.click();

  const stockLedgerLink = page.locator(
    '[data-sidebar="menu-button"][aria-label="Stock Ledger"]',
  );
  await expect(stockLedgerLink).toBeHidden();

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(
    page.getByRole('button', { name: 'Expand sidebar' }),
  ).toBeVisible();
  await expect(inventoryToggle).toBeHidden();
  await expect(stockLedgerLink).toBeVisible();

  const menuButtons = page.locator('[data-sidebar="menu-button"]');
  await expect(menuButtons.first()).toHaveCSS('width', '40px');
  await expect(menuButtons.first()).toHaveCSS('height', '40px');
  const iconSizes = await menuButtons.locator('svg').evaluateAll((icons) =>
    Array.from(
      new Set(
        icons.map((icon) => {
          const style = getComputedStyle(icon);
          return `${style.width}x${style.height}`;
        }),
      ),
    ).sort(),
  );
  expect(iconSizes).toEqual(['18pxx18px']);
  await expect(page.locator('[data-sidebar="rail-divider"]')).toHaveCount(3);

  await stockLedgerLink.click();

  await expect(page).toHaveURL(/\/stock-ledger$/);
  await expect(
    page.getByRole('heading', { name: /stock ledger/i }).first(),
  ).toBeVisible();
  const canvasSoft = await stockLedgerLink.evaluate((link) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--canvas-soft)';
    (link.parentElement ?? document.body).append(probe);
    const backgroundColor = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return backgroundColor;
  });
  await expect(stockLedgerLink).toHaveCSS('background-color', canvasSoft);

  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(
    page.getByRole('button', { name: 'Collapse sidebar' }),
  ).toBeVisible();
});
