import { test, expect } from '@playwright/test';

test.describe('Capture AFTER screenshots', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Capture Login Page AFTER', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screenshots/after-login-page.png',
      fullPage: true
    });
    console.log('✓ Login page AFTER captured');
  });

  test('Capture Dashboard Page AFTER', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForSelector('.project-card', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/after-dashboard-page.png',
      fullPage: true
    });
    console.log('✓ Dashboard page AFTER captured');
  });

  test('Capture Create Modal AFTER', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForSelector('.project-card', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click create button
    await page.click('.project-card-create');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/after-create-modal.png',
      fullPage: true
    });
    console.log('✓ Create modal AFTER captured');
  });
});
