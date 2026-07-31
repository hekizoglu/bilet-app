import { test, expect } from '@playwright/test';

test.describe('Hall Designer Visual Regression', () => {
  test('should match desktop designer snapshot', async ({ page }) => {
    // Navigate to the designer page
    await page.goto('/dashboard/designer');
    
    // Wait for the canvas to load
    await page.waitForSelector('.konvajs-content');

    // Take a screenshot of the main design area
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('desktop-designer.png');
  });

  test('should match mobile designer snapshot', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to the designer page
    await page.goto('/dashboard/designer');
    
    // Wait for the canvas to load
    await page.waitForSelector('.konvajs-content');

    // Take a screenshot
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot('mobile-designer.png');
  });
});
