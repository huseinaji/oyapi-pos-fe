import { expect, test } from '@playwright/test';
import { installApiMocks } from './fixtures';

test.describe('Authentication and route guards', () => {
  test('shows required-field validation without sending a login request', async ({
    page,
  }) => {
    const writes = await installApiMocks(page);
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter your email or username')).toBeVisible();
    await expect(
      page.getByText('Password must be at least 6 characters'),
    ).toBeVisible();
    expect(writes).toHaveLength(0);
  });

  test('toggles password visibility', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/login');

    const password = page.getByRole('textbox', { name: 'Password' });
    await password.fill('test-password');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(
      page.getByRole('textbox', { name: 'Password' }),
    ).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(
      page.getByRole('textbox', { name: 'Password' }),
    ).toHaveAttribute('type', 'password');
  });

  test('shows a clear message when credentials are rejected', async ({
    page,
  }) => {
    await installApiMocks(page, { loginStatus: 401 });
    await page.goto('/login');

    await page.getByLabel('Email or username').fill('wrong-user');
    await page
      .getByRole('textbox', { name: 'Password' })
      .fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in and routes to the authenticated dashboard', async ({
    page,
  }) => {
    await installApiMocks(page);
    await page.goto('/login');

    await page.getByLabel('Email or username').fill('administrator');
    await page.getByRole('textbox', { name: 'Password' }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }).last(),
    ).toBeVisible();
  });

  test('logs in users without dashboard access to cashier sessions', async ({
    page,
  }) => {
    await installApiMocks(page, { userRole: 'CASHIER' });
    await page.goto('/login');

    await page.getByLabel('Email or username').fill('cashier');
    await page.getByRole('textbox', { name: 'Password' }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/cashier-sessions');
    await expect(
      page.getByRole('heading', { name: 'Cashier sessions', exact: true }),
    ).toBeVisible();
  });

  test('redirects users without dashboard access away from the dashboard', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      userRole: 'USER',
    });
    await page.goto('/');

    await expect(page).toHaveURL('/cashier-sessions');
    await expect(
      page.getByRole('heading', { name: 'Cashier sessions', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
    ).toHaveCount(0);
  });

  test('uses the active store role instead of the account role', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      userRole: 'ADMIN',
      storeRole: 'cashier',
    });
    await page.goto('/');

    await expect(page).toHaveURL('/cashier-sessions');
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

    await page.goto('/users');
    await expect(page).toHaveURL('/cashier-sessions');
  });

  test('grants store admin navigation when the account role is not admin', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      userRole: 'USER',
      storeRole: 'admin',
    });
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();

    await page.goto('/stock-ledger');
    await expect(page).toHaveURL('/stock-ledger');
  });

  test('allows cashier users to open items and item categories', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      userRole: 'CASHIER',
    });
    await page.goto('/products');

    await expect(page).toHaveURL('/products');
    await expect(
      page.getByRole('heading', { name: 'Items', exact: true }).last(),
    ).toBeVisible();

    await page.goto('/item-categories');

    await expect(page).toHaveURL('/item-categories');
    await expect(
      page
        .getByRole('heading', { name: 'Item categories', exact: true })
        .last(),
    ).toBeVisible();
  });

  test('requests cashier-session history with the visible page size', async ({
    page,
  }) => {
    const sessionRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/pos-session')) {
        sessionRequests.push(url);
      }
    });
    await installApiMocks(page, { authenticated: true, userRole: 'CASHIER' });
    await page.goto('/cashier-sessions');
    await expect(
      page.getByRole('heading', { name: 'Cashier sessions', exact: true }),
    ).toBeVisible();

    expect(
      sessionRequests.some(
        (url) =>
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('limit') === '10',
      ),
    ).toBe(true);
    expect(
      sessionRequests.some(
        (url) =>
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('limit') === '1' &&
          url.searchParams.get('status') === 'active',
      ),
    ).toBe(true);
  });

  test('redirects unauthenticated users from protected pages to login', async ({
    page,
  }) => {
    await installApiMocks(page);
    await page.goto('/products');

    await expect(page).toHaveURL('/login');
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
  });

  test('requires store selection before showing store pages', async ({
    page,
  }) => {
    await installApiMocks(page, {
      authenticated: true,
      userHasStore: false,
    });
    await page.goto('/products');

    await expect(page).toHaveURL('/select-store');
    await expect(
      page.getByRole('heading', { name: /select.*store/i }),
    ).toBeVisible();
  });

  test('opens the public forgot-password screen', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/forgot-password');

    await expect(page).toHaveURL('/forgot-password');
    await expect(
      page.getByRole('heading', { name: 'Reset password' }),
    ).toBeVisible();
  });

  test('validates email format before sending signup data', async ({
    page,
  }) => {
    const writes = await installApiMocks(page);
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill('store-owner');
    await page.getByLabel('Email address').fill('not-an-email');
    await page
      .getByRole('textbox', { name: /password/i })
      .fill('secure-password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    expect(writes).toHaveLength(0);
  });

  test('creates an account and returns to sign in', async ({ page }) => {
    const writes = await installApiMocks(page);
    await page.goto('/auth/signup');

    await page.getByLabel('Username').fill('store-owner');
    await page.getByLabel('Email address').fill('owner@example.test');
    await page
      .getByRole('textbox', { name: /password/i })
      .fill('secure-password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Account created')).toBeVisible();
    expect(writes).toEqual([
      {
        method: 'POST',
        path: '/api/v1/auth/register',
        body: {
          username: 'store-owner',
          email: 'owner@example.test',
          password: 'secure-password',
        },
      },
    ]);
  });

  test('lets a signed-in user without a store create and select their first store', async ({
    page,
  }) => {
    const writes = await installApiMocks(page, {
      authenticated: true,
      userHasStore: false,
      userRole: 'USER',
    });
    await page.goto('/select-store');

    await page.getByRole('button', { name: 'Create your first store' }).click();
    await expect(page).toHaveURL('/create-store');
    await page.getByLabel('Store name').fill('Harbor Market');
    await page.getByLabel('Address').fill('12 Harbor Road');
    await page.getByLabel('Phone number').fill('+62 812 3456 7890');
    await page
      .getByLabel('Store image URL')
      .fill('https://example.test/logo.png');
    await page.getByRole('button', { name: 'Create store' }).click();

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }).last(),
    ).toBeVisible();
    expect(writes).toContainEqual({
      method: 'POST',
      path: '/api/v1/store',
      body: {
        name: 'Harbor Market',
        address: '12 Harbor Road',
        phone: '+62 812 3456 7890',
        imageUrl: 'https://example.test/logo.png',
      },
    });
  });
});
