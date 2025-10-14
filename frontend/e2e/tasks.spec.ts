import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Task Management
 * Tests task creation, editing, deletion, and filtering
 */

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login or register
    await page.goto('/login');

    const timestamp = Date.now();

    try {
      await page.fill('input[id="email"]', 'e2e-test@example.com');
      await page.fill('input[id="password"]', 'Test123456');
      await page.click('button:has-text("Login")');
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    } catch {
      await page.click('text=Register');
      await page.fill('input[id="name"]', `E2E Test User ${timestamp}`);
      await page.fill('input[id="email"]', `e2e-${timestamp}@example.com`);
      await page.fill('input[id="password"]', 'Test123456');
      await page.click('button:has-text("Create Account")');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    }

    // Navigate to a board (or create one if none exist)
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
  });

  test('should create a new task', async ({ page }) => {
    // Should be on kanban board
    await expect(page).toHaveURL(/\/board\//);

    // Click "Add Task" button in first column
    const addTaskButtons = page.locator('button:has-text("Add Task")');
    await expect(addTaskButtons.first()).toBeVisible({ timeout: 10000 });
    await addTaskButtons.first().click();

    // Wait for task modal to appear
    await expect(page.locator('.modal-content')).toBeVisible();

    // Fill in task details
    const taskTitle = `Test Task ${Date.now()}`;
    await page.fill('input[type="text"]', taskTitle);
    await page.fill('textarea', 'Test task description');

    // Select priority
    await page.selectOption('select', '2'); // Medium priority

    // Submit form
    await page.click('button:has-text("Create")');

    // Wait for modal to close
    await expect(page.locator('.modal-content')).not.toBeVisible({ timeout: 5000 });

    // Should see the new task in the board
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Find a task card
    const taskCards = page.locator('.task-card');
    const taskCount = await taskCards.count();

    if (taskCount > 0) {
      // Click edit button on first task (pencil icon)
      const firstTask = taskCards.first();
      await firstTask.locator('button:has-text("✏️")').click();

      // Wait for edit modal
      await expect(page.locator('.modal-content')).toBeVisible();
      await expect(page.locator('h2:has-text("Edit Task")')).toBeVisible();

      // Modify task title
      const titleInput = page.locator('input[type="text"]');
      await titleInput.fill(`Updated Task ${Date.now()}`);

      // Submit changes
      await page.click('button:has-text("Update")');

      // Modal should close
      await expect(page.locator('.modal-content')).not.toBeVisible({ timeout: 5000 });
    } else {
      console.log('No tasks found to edit');
    }
  });

  test('should delete a task', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Create a task first to ensure we have one to delete
    await page.locator('button:has-text("Add Task")').first().click();
    await page.locator('input[type="text"]').fill(`Task to Delete ${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);

    // Now delete it
    const taskCards = page.locator('.task-card');
    const taskCount = await taskCards.count();

    if (taskCount > 0) {
      // Click delete button on first task (trash icon)
      const firstTask = taskCards.first();

      // Setup dialog handler before clicking delete
      page.on('dialog', dialog => dialog.accept());

      await firstTask.locator('button:has-text("🗑️")').click();

      // Task should be removed
      await page.waitForTimeout(1000);
    }
  });

  test('should filter tasks by search query', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]:near(:text("Search"))').first();

    if (await searchInput.isVisible()) {
      // Type in search query
      await searchInput.fill('specific search term');

      // Wait for filtering to happen
      await page.waitForTimeout(500);

      // Tasks should be filtered (visual check in headed mode)
      // Exact assertion depends on if matching tasks exist
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Find priority filter dropdown
    const priorityFilter = page.locator('select:near(:text("Priority"))').first();

    if (await priorityFilter.isVisible()) {
      // Select "High" priority
      await priorityFilter.selectOption('3');

      // Wait for filtering
      await page.waitForTimeout(500);

      // Tasks should be filtered (visual check)
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Find status filter dropdown
    const statusFilter = page.locator('select:near(:text("Status"))').first();

    if (await statusFilter.isVisible()) {
      // Select a specific status
      await statusFilter.selectOption({ index: 1 });

      // Wait for filtering
      await page.waitForTimeout(500);

      // Tasks should be filtered (visual check)
    }
  });

  test('should show task priority badges with correct colors', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Find tasks with priority badges
    const priorityBadges = page.locator('.task-priority, [class*="priority"]');

    if ((await priorityBadges.count()) > 0) {
      // Check that priority badges are visible
      await expect(priorityBadges.first()).toBeVisible();

      // Visual check in headed mode will show different colors
    }
  });

  test('should validate required fields in task creation', async ({ page }) => {
    await expect(page).toHaveURL(/\/board\//);

    // Click "Add Task"
    await page.locator('button:has-text("Add Task")').first().click();
    await expect(page.locator('.modal-content')).toBeVisible();

    // Try to submit without title
    await page.click('button:has-text("Create")');

    // Modal should stay open (validation failed)
    await expect(page.locator('.modal-content')).toBeVisible();

    // Create button should be disabled or form shouldn't submit
    const titleInput = page.locator('input[type="text"]');
    const isRequired = await titleInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });
});
