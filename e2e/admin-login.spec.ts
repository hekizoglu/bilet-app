import { test, expect } from '@playwright/test';

test.describe('Admin Panel Akışı', () => {
  test('Admin girişi yapıp dashboard ve designer görebilme', async ({ page, context }) => {
    // 1. Bypass login by setting the admin token directly
    await context.addCookies([
      {
        name: 'token',
        value: 'LOCAL_ADMIN_TOKEN',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Admin sayfasına git
    await page.goto('/admin');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });

    // 3. Salon Tasarımcısına git
    await page.goto('/admin/designer');
    
    // Landing sayfası yüklendi mi?
    await expect(page.locator('h1:has-text("Salon Tasarımcısı")').first()).toBeVisible({ timeout: 15000 });
    
    // Boş Tuval seçeneğine tıkla
    await page.click('text=Tuvali Aç');

    // Canvas render edilmiş mi?
    await expect(page.locator('div.konvajs-content').first()).toBeVisible({ timeout: 15000 });
  });
});
