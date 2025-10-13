import { test } from '@playwright/test';

test('capture login page AFTER improvements', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: '../screenshots/after-login.png',
    fullPage: false
  });
});
