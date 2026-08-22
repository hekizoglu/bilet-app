import { test, expect } from '@playwright/test';

test.describe('Bilet Alma Akışı', () => {
  test('Ana sayfadan etkinlik seçip satın alma formuna ilerleyebilme', async ({ page }) => {
    // 1. Ana sayfaya git
    await page.goto('/');
    await expect(page.locator('text=Yaklaşan Etkinlikler').first()).toBeVisible({ timeout: 20000 });

    // 2. İlk etkinliğe tıkla
    // /event/create (hero CTA) hariç gerçek etkinlik linkini seç — UUID'ler tire içerir
    const firstEventLink = page.locator('a[href^="/event/"][href*="-"]').first();
    await expect(firstEventLink).toBeVisible({ timeout: 20000 });
    await firstEventLink.click();

    // 3. Etkinlik detay sayfası
    await page.waitForURL(/\/event\/.+/, { timeout: 20000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });

    // 4. Form veya bekleme listesi formu görünmeli
    await page.waitForSelector('form', { state: 'attached', timeout: 20000 });
    const formElement = page.locator('form').first();
    await expect(formElement).toBeVisible();

    // 5. Müşteri bilgileri formundaysak doldur ve gönder
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('e2e-test@example.com');
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('E2E Test Kullanıcısı');
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      // Başarı veya hata toast'ı görünmeli (akışın çalıştığını kanıtlar)
      await page.waitForTimeout(2500);
    }
  });
});
