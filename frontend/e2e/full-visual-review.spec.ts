import { test, expect } from '@playwright/test';

test.describe('Full Visual Review - BEFORE', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Capture Login Page', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({
      path: 'screenshots/before-login-page.png',
      fullPage: true
    });
    console.log('✓ Login page captured');
  });

  test('Capture Dashboard Page', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screenshots/before-dashboard-page.png',
      fullPage: true
    });
    console.log('✓ Dashboard page captured');
  });

  test('Capture Kanban Page', async ({ page }) => {
    await page.goto('http://localhost:5174/board/1');
    await page.waitForTimeout(2000); // More time for Kanban to load
    await page.screenshot({
      path: 'screenshots/before-kanban-page.png',
      fullPage: true
    });
    console.log('✓ Kanban page captured');
  });

  test('Capture Create Modal on Dashboard', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForTimeout(1000);

    // Click "Create New Board" card
    await page.click('.project-card-create');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/before-create-modal.png',
      fullPage: true
    });
    console.log('✓ Create modal captured');
  });
});
