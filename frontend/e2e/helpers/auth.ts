import { Page } from '@playwright/test';

/**
 * Helper function to authenticate a user
 * Tries to login, and if it fails, registers a new user
 */
export async function authenticateUser(page: Page, email?: string, password?: string) {
  const timestamp = Date.now();
  const testEmail = email || 'e2e-test@example.com';
  const testPassword = password || 'Test123456';

  await page.goto('/login');

  try {
    // Try login first
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
  } catch {
    // If login fails, register new user
    await page.click('text=Register');
    await page.fill('input[id="name"]', `E2E Test User ${timestamp}`);
    await page.fill('input[id="email"]', `e2e-${timestamp}@example.com`);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button:has-text("Create Account")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  }
}

/**
 * Helper function to navigate to a board
 * Creates one if none exist
 */
export async function navigateToBoard(page: Page) {
  const boardCards = page.locator('.board-card, [class*="board-card"]');
  const boardCount = await boardCards.count();

  if (boardCount === 0) {
    // Create a board for testing
    await page.click('button:has-text("Create Board")');
    await page.fill('input[id="name"]', `Test Board ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
  }

  // Click on first board
  await boardCards.first().click();
  await page.waitForURL(/\/board\/[a-f0-9-]+/);
}

/**
 * Helper function to create a test task
 */
export async function createTestTask(
  page: Page,
  title?: string,
  description?: string,
  priority: number = 2
) {
  const taskTitle = title || `Test Task ${Date.now()}`;
  const taskDescription = description || 'Test task description';

  // Click "Add Task" button in first column
  const addTaskButtons = page.locator('button:has-text("Add Task")');
  await addTaskButtons.first().click();

  // Wait for modal
  await page.locator('.modal-content').waitFor({ state: 'visible' });

  // Fill in task details
  await page.fill('input[type="text"]', taskTitle);
  await page.fill('textarea', taskDescription);
  await page.selectOption('select', priority.toString());

  // Submit form
  await page.click('button:has-text("Create")');

  // Wait for modal to close
  await page.locator('.modal-content').waitFor({ state: 'hidden', timeout: 5000 });

  return taskTitle;
}
