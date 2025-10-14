import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Board Management
 * Tests board creation, editing, and deletion
 */

test.describe('Board Management', () => {
  // This test requires authentication
  // In a real scenario, you'd use a setup script or test fixtures

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Quick login (would use test fixtures in production)
    // For now, we'll test the full flow
    await page.goto('/login');

    // Try to login with test credentials or register new user
    const timestamp = Date.now();

    try {
      // Try login first
      await page.fill('input[id="email"]', 'e2e-test@example.com');
      await page.fill('input[id="password"]', 'Test123456');
      await page.click('button:has-text("Login")');
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    } catch {
      // If login fails, register new user
      await page.click('text=Register');
      await page.fill('input[id="name"]', `E2E Test User ${timestamp}`);
      await page.fill('input[id="email"]', `e2e-${timestamp}@example.com`);
      await page.fill('input[id="password"]', 'Test123456');
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    }
  });

  test('should create a new board', async ({ page }) => {
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Click create board button
    await page.click('button:has-text("Create Board")');

    // Wait for modal to appear
    await expect(page.locator('.modal-content')).toBeVisible();

    // Fill in board details
    const boardName = `Test Board ${Date.now()}`;
    await page.fill('input[id="name"]', boardName);
    await page.fill('textarea[id="description"]', 'Test board description');

    // Submit form
    await page.click('button:has-text("Create")');

    // Wait for modal to close
    await expect(page.locator('.modal-content')).not.toBeVisible({ timeout: 5000 });

    // Should see the new board in the list
    await expect(page.locator(`text=${boardName}`)).toBeVisible();
  });

  test('should navigate to board when clicked', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Get first board card (if any exist)
    const boardCards = page.locator('.board-card, [class*="board"]');
    const count = await boardCards.count();

    if (count > 0) {
      // Click on first board
      await boardCards.first().click();

      // Should navigate to board page
      await expect(page).toHaveURL(/\/board\/[a-f0-9-]+/);

      // Should see kanban columns
      await expect(page.locator('.kanban-column, [class*="column"]')).toBeVisible();
    } else {
      console.log('No boards found - create a board first');
    }
  });

  test('should show empty state when no boards exist', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // This test assumes a fresh user with no boards
    // Look for empty state message
    const hasBoardCards = (await page.locator('.board-card').count()) > 0;

    if (!hasBoardCards) {
      await expect(
        page.locator('text=/no boards|create your first/i')
      ).toBeVisible();
    }
  });

  test('should validate required fields in board creation', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Open create board modal
    await page.click('button:has-text("Create Board")');
    await expect(page.locator('.modal-content')).toBeVisible();

    // Try to submit without filling required fields
    await page.click('button:has-text("Create")');

    // Should not close modal (validation failed)
    await expect(page.locator('.modal-content')).toBeVisible();

    // Check if name input is required
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toHaveAttribute('required', '');
  });

  test('should close modal when clicking cancel', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Open create board modal
    await page.click('button:has-text("Create Board")');
    await expect(page.locator('.modal-content')).toBeVisible();

    // Click cancel button
    await page.click('button:has-text("Cancel")');

    // Modal should close
    await expect(page.locator('.modal-content')).not.toBeVisible();
  });
});
