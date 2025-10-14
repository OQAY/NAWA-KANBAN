import { test } from '@playwright/test';

test('capture dashboard page', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navegar primeiro e depois setar localStorage
  await page.goto('http://localhost:5174');

  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    }));
  });

  // Recarregar para aplicar auth
  await page.goto('http://localhost:5174/dashboard');

  // Esperar mais tempo ou até elemento específico aparecer
  await page.waitForTimeout(5000);

  await page.screenshot({
    path: '../screenshots/before-dashboard.png',
    fullPage: true
  });
});
