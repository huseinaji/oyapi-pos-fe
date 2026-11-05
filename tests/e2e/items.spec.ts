import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  BUNDLE_ITEM_ID,
  installApiMocks,
  type ApiMockOptions,
} from './fixtures';

async function openItemsPage(
  page: Page,
  options: ApiMockOptions = {},
): Promise<void> {
  await installApiMocks(page, { authenticated: true, ...options });
  await page.goto('/products');
  await expect(
    page.getByRole('heading', { name: 'Items', exact: true }).last(),
  ).toBeVisible();
}

test.describe('Items catalog', () => {
  test('prepopulates and saves description when editing an item', async ({
    page,
  }) => {
    const writes = await installApiMocks(page, { authenticated: true });
    await page.goto('/products');
    await page
      .locator('table:visible')
      .getByText('croffle icecream', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Edit item', exact: true }).click();

    const form = page.getByRole('dialog', { name: 'Edit item' });
    const description = form.getByRole('textbox', { name: 'Description' });
    await expect(description).toHaveValue('croffle icecream description');
    await description.fill('Fresh croffle served with ice cream.');
    await form.getByRole('button', { name: 'Save changes' }).click();

    await expect(form).toBeHidden();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/store/test-store/items/item-finished',
      body: { description: 'Fresh croffle served with ice cream.' },
    });
  });

  test('includes description in the create item request', async ({ page }) => {
    const writes = await installApiMocks(page, { authenticated: true });
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add item' }).first().click();

    const form = page.getByRole('dialog', { name: 'New item' });
    await form.getByRole('textbox', { name: 'Item name' }).fill('Test coffee');
    await form
      .getByRole('textbox', { name: 'Description' })
      .fill('Single-origin coffee beans.');
    const numberInputs = form.locator('input[type="number"]');
    await numberInputs.nth(1).fill('2500');
    await numberInputs.nth(2).fill('1');
    await form.getByRole('button', { name: 'Create product' }).click();

    await expect(form).toBeHidden();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/store/test-store/items',
      body: {
        name: 'Test coffee',
        description: 'Single-origin coffee beans.',
      },
    });
  });

  test('renders item category names from the API response', async ({
    page,
  }) => {
    await openItemsPage(page);
    await expect(page.getByText('Bahan baku').first()).toBeVisible();
    await expect(page.getByText('Dessert').first()).toBeVisible();
    await expect(
      page
        .locator('table:visible')
        .getByText('adonan filling', { exact: true }),
    ).toBeVisible();
  });

  test('filters items by search and shows an empty state for no match', async ({
    page,
  }) => {
    await openItemsPage(page);
    const search = page.getByPlaceholder('Search by name…');
    await search.fill('adonan filling');

    await expect(
      page
        .locator('table:visible')
        .getByText('adonan filling', { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator('table:visible')
        .getByText('croffle icecream', { exact: true }),
    ).toHaveCount(0);

    await search.fill('not-in-the-catalog');
    await expect(page.getByText('No items matched your search.')).toBeVisible();
  });

  test('filters the list by category', async ({ page }) => {
    await openItemsPage(page);
    await page.getByRole('button', { name: 'Bahan baku' }).click();

    await expect(
      page.locator('table:visible').getByText('adonan', { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator('table:visible')
        .getByText('croffle icecream', { exact: true }),
    ).toHaveCount(0);
  });

  test('paginates the item table without hanging', async ({ page }) => {
    const itemListRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.pathname === '/api/v1/store/test-store/items' &&
        !url.searchParams.has('type')
      ) {
        itemListRequests.push(url);
      }
    });
    await openItemsPage(page);
    await expect(
      page.locator('table:visible').getByText('Catalog item 07'),
    ).toBeVisible();
    await expect(
      page.locator('table:visible').getByText('Catalog item 10'),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(
      page.locator('table:visible').getByText('Catalog item 10'),
    ).toBeVisible();
    await expect(
      page.locator('table:visible').getByText('adonan', { exact: true }),
    ).toHaveCount(0);
    expect(
      itemListRequests.some(
        (url) =>
          url.searchParams.get('page') === '2' &&
          url.searchParams.get('limit') === '10',
      ),
    ).toBe(true);
  });

  test('paginates item categories using the selected API page size', async ({
    page,
  }) => {
    const categoryRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/items/categories')) {
        categoryRequests.push(url);
      }
    });
    await installApiMocks(page, { authenticated: true });
    await page.goto('/item-categories');
    await expect(
      page
        .getByRole('heading', { name: 'Item categories', exact: true })
        .last(),
    ).toBeVisible();
    await expect(page.getByText('Bahan baku', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(
      page.getByText('Test category 09', { exact: true }),
    ).toBeVisible();
    expect(
      categoryRequests.some(
        (url) =>
          url.searchParams.get('page') === '2' &&
          url.searchParams.get('limit') === '10',
      ),
    ).toBe(true);
  });

  test('opens the bundle detail drawer and shows its components', async ({
    page,
  }) => {
    await openItemsPage(page);
    await page
      .locator('table:visible')
      .getByText('adonan filling', { exact: true })
      .click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole('heading', { name: 'Bundle components' }),
    ).toBeVisible();
    await expect(drawer.getByText('croffle icecream')).toBeVisible();
    await expect(drawer.getByText('2 Pieces')).toBeVisible();
  });

  test('prepopulates existing bundle components while limiting new options to raw materials', async ({
    page,
  }) => {
    await openItemsPage(page);
    await page
      .locator('table:visible')
      .getByText('adonan filling', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Edit item', exact: true }).click();

    const form = page.getByRole('dialog', { name: 'Edit item' });
    await expect(
      form.getByRole('heading', { name: 'Edit item' }),
    ).toBeVisible();
    await expect(form.locator('input[name="name"]')).toHaveValue(
      'adonan filling',
    );
    await expect(
      form.getByText('croffle icecream · existing component'),
    ).toBeVisible();
    await expect(form.locator('input[type="number"]').first()).toHaveValue('2');

    await form
      .getByRole('button')
      .filter({ hasText: 'existing component' })
      .click();
    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveText(['adonan · Raw Material']);
    await expect(
      page.getByRole('option', { name: 'croffle icecream' }),
    ).toHaveCount(0);
  });

  test('sends existing bundle components when updating the item', async ({
    page,
  }) => {
    const writes = await installApiMocks(page, { authenticated: true });
    await page.goto('/products');
    await page
      .locator('table:visible')
      .getByText('adonan filling', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Edit item', exact: true }).click();

    const form = page.getByRole('dialog', { name: 'Edit item' });
    await form.locator('input[name="name"]').fill('adonan filling updated');
    await form.getByRole('button', { name: 'Save changes' }).click();

    await expect(form).toBeHidden();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'PATCH',
      path: `/api/v1/store/test-store/items/${BUNDLE_ITEM_ID}`,
      body: {
        name: 'adonan filling updated',
        itemComponents: [
          {
            componentItemId: 'item-finished',
            qty: 2,
          },
        ],
      },
    });
  });

  test('shows a save error and keeps the edit dialog open when the API rejects an update', async ({
    page,
  }) => {
    await openItemsPage(page, { saveStatus: 500 });
    await page
      .locator('table:visible')
      .getByText('adonan filling', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Edit item', exact: true }).click();

    const form = page.getByRole('dialog', { name: 'Edit item' });
    await form.locator('input[name="name"]').fill('adonan filling updated');
    await form.getByRole('button', { name: 'Save changes' }).click();

    await expect(form.getByText('Save rejected by test mock')).toBeVisible();
    await expect(form).toBeVisible();
  });

  test('reports item load failures and allows retry', async ({ page }) => {
    await openItemsPage(page, { failFirstItemsRequest: true });
    await expect(
      page.getByText('Failed to load items. Please try again.'),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(
      page.getByText('Failed to load items. Please try again.'),
    ).toBeHidden();
  });

  test('opens the bundle drawer from a row without navigating away', async ({
    page,
  }) => {
    await openItemsPage(page);
    await page
      .locator('table:visible')
      .getByText('adonan filling', { exact: true })
      .click();
    await expect(page).toHaveURL('/products');
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
