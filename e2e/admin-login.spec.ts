import { test, expect } from '@playwright/test';

// Gerçek bir JWT al (yerel test token'ı backend'de JWT'ye çevrilir)
async function getToken(request: any, tokenName: string): Promise<string> {
  const res = await request.post('http://localhost:5000/api/auth/google', {
    data: { token: tokenName },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.token;
}

test.describe('Admin Panel Akışı', () => {
  test('Admin girişi yapıp dashboard ve designer görebilme', async ({ page, context, request }) => {
    // 1. Gerçek JWT'yi cookie'ye koy
    const jwt = await getToken(request, 'LOCAL_ADMIN_TOKEN');
    await context.addCookies([
      { name: 'token', value: jwt, domain: 'localhost', path: '/' },
    ]);

    // 2. Dashboard'a git — masaüstü yan menüsündeki 'Etkinlikler' linki görünür olmalı
    await page.goto('/dashboard');
    await expect(page.locator('a[href="/dashboard/events"]').first()).toBeVisible({ timeout: 20000 });

    // 3. Salon Tasarımcısına git — landing yüklenmeli
    await page.goto('/dashboard/designer');
    await page.waitForTimeout(3000);
    const hasDesignerText = await page.locator('text=Sihirbaz').count();
    expect(hasDesignerText > 0).toBeTruthy();
  });
});
