import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures';

async function openTransactionsPage(
  page: Parameters<typeof installApiMocks>[0],
  posSessionOpen = false,
) {
  await installApiMocks(page, {
    authenticated: true,
    posSessionOpen,
  });
  await page.goto('/transactions');
  await expect(
    page.getByRole('heading', { name: 'Transactions', exact: true }).last(),
  ).toBeVisible();
}

function orderCount(page: Parameters<typeof installApiMocks>[0]) {
  return page.getByText('Orders on page').locator('..').locator('p').nth(1);
}

test.describe('Transactions page', () => {
  test.use({ timezoneId: 'Asia/Jakarta' });

  test('only shows New sale when the POS session is open', async ({ page }) => {
    await openTransactionsPage(page);
    await expect(page.getByRole('link', { name: 'New sale' })).toHaveCount(0);

    await page.goto('/login');
    await openTransactionsPage(page, true);
    await expect(page.getByRole('link', { name: 'New sale' })).toHaveAttribute(
      'href',
      '/pos',
    );
  });

  test('defaults to Today and restores the Today filter after a reload', async ({
    page,
  }) => {
    const invoiceRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/invoice')) invoiceRequests.push(url);
    });
    await openTransactionsPage(page);
    expect(
      invoiceRequests.some(
        (url) =>
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('limit') === '10' &&
          url.searchParams.get('dateRange') === 'today' &&
          url.searchParams.get('timezone') === 'Asia/Jakarta',
      ),
    ).toBe(true);
    await expect(orderCount(page)).toHaveText('1');

    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await expect(
      page.getByRole('button', { name: 'Today', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Last 30 days' }).click();
    await expect(orderCount(page)).toHaveText('2');

    await page.reload();
    await expect(orderCount(page)).toHaveText('1');
  });

  test('converts UTC timestamps to the browser timezone in the list and detail', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      transactionCount: 1,
      transactionCreatedAt: '2026-10-25T18:30:00.000Z',
    });
    await page.goto('/transactions');
    await expect(
      page.getByRole('heading', { name: 'Transactions', exact: true }).last(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await page.getByRole('button', { name: 'Last 30 days' }).click();

    const transactionRow = page.getByRole('row').filter({
      has: page.getByRole('button', { name: 'Actions for INV-TODAY' }),
    });
    const timestamp = new Date('2026-10-25T18:30:00.000Z');
    const expectedTableDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
    }).format(timestamp);
    await expect(transactionRow.getByRole('cell').nth(5)).toHaveText(
      expectedTableDate,
    );

    await transactionRow.getByRole('cell').first().click();
    const expectedDetailDate = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(timestamp);
    await expect(
      page.getByRole('definition').filter({ hasText: expectedDetailDate }),
    ).toBeVisible();
  });

  test('Clear all filters restores Today as the default date range', async ({
    page,
  }) => {
    await openTransactionsPage(page);
    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await page.getByRole('button', { name: 'Last 30 days' }).click();
    await page.getByRole('button', { name: 'complete', exact: true }).click();
    await page.getByRole('button', { name: 'Clear all filters' }).click();

    await expect(orderCount(page)).toHaveText('1');
    await expect(
      page.getByRole('button', { name: 'Today', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('sends supported date presets to the API with the IANA timezone', async ({
    page,
  }) => {
    const invoiceRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/invoice')) invoiceRequests.push(url);
    });
    await openTransactionsPage(page);
    await page.getByRole('button', { name: 'Advanced filters' }).click();

    await page.getByRole('button', { name: 'Last 30 days' }).click();
    await expect
      .poll(() =>
        invoiceRequests.some(
          (url) =>
            url.searchParams.get('dateRange') === 'last30days' &&
            url.searchParams.get('timezone') === 'Asia/Jakarta',
        ),
      )
      .toBe(true);

    await page.getByRole('button', { name: 'Last 7 days' }).click();
    await expect
      .poll(() =>
        invoiceRequests.some(
          (url) =>
            url.searchParams.get('dateRange') === 'custom' &&
            url.searchParams.has('startDate') &&
            url.searchParams.has('endDate') &&
            url.searchParams.get('timezone') === 'Asia/Jakarta',
        ),
      )
      .toBe(true);
  });

  test('fetches each selected transaction page from the API', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      transactionCount: 25,
    });
    await page.goto('/transactions');
    await expect(
      page.getByRole('heading', { name: 'Transactions', exact: true }).last(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await page.getByRole('button', { name: 'Last 30 days' }).click();
    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await expect(
      page.getByRole('button', { name: 'Advanced filters' }),
    ).toHaveAttribute('aria-expanded', 'false');

    const page2Request = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith('/invoice') &&
        url.searchParams.get('page') === '2' &&
        url.searchParams.get('limit') === '10'
      );
    });
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await page2Request;
    await expect(
      page.getByRole('button', { name: 'Actions for INV-DAY-10' }),
    ).toBeVisible();

    const page3Request = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith('/invoice') &&
        url.searchParams.get('page') === '3' &&
        url.searchParams.get('limit') === '10'
      );
    });
    await page.getByRole('button', { name: 'Go to page 3' }).click();
    await page3Request;
    await expect(
      page.getByRole('button', { name: 'Actions for INV-DAY-20' }),
    ).toBeVisible();

    await page.getByRole('combobox', { name: 'Rows per page' }).click();
    await page.getByRole('option', { name: '25', exact: true }).click();
    await expect(orderCount(page)).toHaveText('25');
    await expect(
      page.getByRole('button', { name: 'Actions for INV-DAY-24' }),
    ).toBeVisible();
  });
});
