import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { expect, type Page } from '@playwright/test';

export type AccountRole = 'admin' | 'rnd' | 'viewer';

export interface AccountCredentials {
  role: AccountRole;
  email: string;
  password: string;
  defaultLandingGlob: string;
}

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
const SESSION_KEY = 'recipehub_backend_session';

export function getAccount(role: AccountRole): AccountCredentials {
  const password = process.env.E2E_PASSWORD ?? 'Demo@1234';

  switch (role) {
    case 'admin':
      return {
        role: 'admin',
        email: process.env.E2E_ADMIN_EMAIL ?? 'admin@recipehub.demo',
        password,
        defaultLandingGlob: '**/admin/**',
      };
    case 'rnd':
      return {
        role: 'rnd',
        email: process.env.E2E_RND_EMAIL ?? process.env.E2E_RD_EMAIL ?? 'rd@recipehub.demo',
        password,
        defaultLandingGlob: '**/rnd/**',
      };
    case 'viewer':
      return {
        role: 'viewer',
        email: process.env.E2E_VIEWER_EMAIL ?? 'viewer@recipehub.demo',
        password,
        defaultLandingGlob: '**/viewer/**',
      };
  }
}

export function getAuthStatePath(role: AccountRole): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

export interface LoginOptions {
  /** Gọi callback sau khi mở /login nhưng trước khi điền mật khẩu (dùng để chụp B1 an toàn). */
  beforeFillPassword?: (page: Page) => Promise<void>;
}

/**
 * Đăng nhập qua giao diện /login, chờ điều hướng về trang mặc định của vai trò
 * và lưu storageState vào tests/e2e/.auth/<role>.json.
 */
export async function loginAs(
  page: Page,
  role: AccountRole,
  opts?: LoginOptions
): Promise<AccountCredentials> {
  const account = getAccount(role);
  await fs.mkdir(AUTH_DIR, { recursive: true });

  const heading = page.getByRole('heading', { name: 'Chào mừng trở lại' });
  // Trang /login là client component trong Suspense; đôi khi hydrate chậm và kẹt ở fallback.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const ready = await heading
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (ready) break;
    if (attempt === 3) await expect(heading).toBeVisible();
  }

  if (opts?.beforeFillPassword) {
    await opts.beforeFillPassword(page);
  }

  await page.getByLabel(/^Email/i).fill(account.email);
  await page.getByLabel(/^Mật khẩu/i).fill(account.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  await page.waitForURL(account.defaultLandingGlob, { timeout: 30_000 });

  // Đồng bộ sessionStorage sang localStorage để file storageState lưu kèm phiên làm việc
  const sessionRaw = await page.evaluate((key) => {
    const val = window.sessionStorage.getItem(key);
    if (val) {
      window.localStorage.setItem(key, val);
    }
    return val;
  }, SESSION_KEY);

  await page.context().storageState({ path: getAuthStatePath(role) });

  if (sessionRaw) {
    await page.context().addInitScript(
      ({ key, value }) => {
        if (!window.sessionStorage.getItem(key) && value) {
          window.sessionStorage.setItem(key, value);
        }
      },
      { key: SESSION_KEY, value: sessionRaw }
    );
  }

  return account;
}

/**
 * Đọc accessToken hiện tại từ sessionStorage của trình duyệt để gọi API kiểm thử phân quyền.
 */
export async function getAccessToken(page: Page): Promise<{ userId: string; accessToken: string } | null> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { userId?: string; accessToken?: string };
      if (!parsed.accessToken || !parsed.userId) return null;
      return { userId: parsed.userId, accessToken: parsed.accessToken };
    } catch {
      return null;
    }
  }, SESSION_KEY);
}
