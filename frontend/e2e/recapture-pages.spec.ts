import { test, expect } from '@playwright/test';

test.describe('Recapture Dashboard and Kanban - BEFORE', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Recapture Dashboard Page - Wait for Content', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');

    // Wait for loading to finish - wait for project cards to appear
    await page.waitForSelector('.project-card', { timeout: 10000 });
    await page.waitForTimeout(2000); // Extra time for animations

    await page.screenshot({
      path: 'screenshots/before-dashboard-full.png',
      fullPage: true
    });
    console.log('✓ Dashboard page (full) captured');
  });

  test('Recapture Kanban Page - Wait for Content', async ({ page }) => {
    await page.goto('http://localhost:5174/board/1');

    // Wait for kanban columns to appear
    await page.waitForSelector('.kanban-column', { timeout: 10000 }).catch(() => {
      console.log('Kanban columns not found, might be empty board');
    });
    await page.waitForTimeout(3000); // Extra time for data loading

    await page.screenshot({
      path: 'screenshots/before-kanban-full.png',
      fullPage: true
    });
    console.log('✓ Kanban page (full) captured');
  });
});
