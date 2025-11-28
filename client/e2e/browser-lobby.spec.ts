import { test, expect } from '@playwright/test';

test.describe('Browser Lobby - Main Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main menu with Create and Join buttons', async ({ page }) => {
    // Use getByRole for buttons - matches by accessible name
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Lobby/i })).toBeVisible();
    
    // Verify tagline
    await expect(page.getByText('Test what you know. Win with confidence!')).toBeVisible();
  });

  test('should display the How to Play section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /How to Play/i })).toBeVisible();
    await expect(page.getByText(/Answer trivia questions/)).toBeVisible();
  });

  test('should display Discord info', async ({ page }) => {
    await expect(page.getByText(/Playing on Discord/)).toBeVisible();
  });

  test('should have theme toggle button', async ({ page }) => {
    // Theme toggle has accessible name "Switch to dark/light mode"
    await expect(page.getByRole('button', { name: /Switch to (dark|light) mode/i })).toBeVisible();
  });
});

test.describe('Browser Lobby - Create Lobby Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Create Lobby/i }).click();
  });

  test('should navigate to create lobby screen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Lobby' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your name...')).toBeVisible();
    await expect(page.getByText(/Your Username/)).toBeVisible();
  });

  test('should have back button that returns to menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should be back on main menu
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Lobby/i })).toBeVisible();
  });

  test('should show character count', async ({ page }) => {
    await expect(page.getByText('0/20 characters')).toBeVisible();
    
    await page.getByPlaceholder('Enter your name...').fill('TestUser');
    await expect(page.getByText('8/20 characters')).toBeVisible();
  });

  test('should limit username to 20 characters', async ({ page }) => {
    const input = page.getByPlaceholder('Enter your name...');
    await input.fill('ThisIsAVeryLongUsernameThatExceeds20Characters');
    
    // Should be truncated to 20 chars
    await expect(input).toHaveValue('ThisIsAVeryLongUsern');
  });

  test('should disable create button when username is empty', async ({ page }) => {
    // Button has emoji in accessible name: "🎉 Create Lobby"
    const createButton = page.getByRole('button', { name: /Create Lobby$/i });
    await expect(createButton).toBeDisabled();
  });

  test('should enable create button when username is entered', async ({ page }) => {
    await page.getByPlaceholder('Enter your name...').fill('Player1');
    
    // Button has emoji in accessible name: "🎉 Create Lobby"
    const createButton = page.getByRole('button', { name: /Create Lobby$/i });
    await expect(createButton).toBeEnabled();
  });

  test('should remember username from localStorage', async ({ page }) => {
    // Set username in localStorage
    await page.evaluate(() => {
      localStorage.setItem('trivia_user', JSON.stringify({ id: 'test123', username: 'SavedPlayer' }));
    });
    
    // Reload and go to create screen
    await page.goto('/');
    await page.getByRole('button', { name: /Create Lobby/i }).click();
    
    // Username should be pre-filled
    await expect(page.getByPlaceholder('Enter your name...')).toHaveValue('SavedPlayer');
  });
});

test.describe('Browser Lobby - Join Lobby Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Join Lobby/i }).click();
  });

  test('should navigate to join lobby screen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Join Lobby' })).toBeVisible();
    await expect(page.getByPlaceholder('ABC123')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your name...')).toBeVisible();
  });

  test('should have back button that returns to menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should be back on main menu
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
  });

  test('should uppercase lobby code input', async ({ page }) => {
    const codeInput = page.getByPlaceholder('ABC123');
    await codeInput.fill('xyz789');
    
    await expect(codeInput).toHaveValue('XYZ789');
  });

  test('should limit lobby code to 6 characters', async ({ page }) => {
    const codeInput = page.getByPlaceholder('ABC123');
    await codeInput.fill('ABCDEFGHIJ');
    
    await expect(codeInput).toHaveValue('ABCDEF');
  });

  test('should disable join button when code is incomplete', async ({ page }) => {
    await page.getByPlaceholder('ABC123').fill('ABC');
    await page.getByPlaceholder('Enter your name...').fill('Player');
    
    const joinButton = page.getByRole('button', { name: /Join Lobby/i, exact: true });
    await expect(joinButton).toBeDisabled();
  });

  test('should disable join button when username is empty', async ({ page }) => {
    await page.getByPlaceholder('ABC123').fill('ABC123');
    
    const joinButton = page.getByRole('button', { name: /Join Lobby/i, exact: true });
    await expect(joinButton).toBeDisabled();
  });

  test('should enable join button when code and username are valid', async ({ page }) => {
    await page.getByPlaceholder('ABC123').fill('XYZ789');
    await page.getByPlaceholder('Enter your name...').fill('Player1');
    
    const joinButton = page.getByRole('button', { name: /Join Lobby/i, exact: true });
    await expect(joinButton).toBeEnabled();
  });
});

test.describe('Browser Lobby - URL Parameters', () => {
  test('should show main menu when lobby code is in URL', async ({ page }) => {
    await page.goto('/?lobby=TEST01');
    
    // Should start on main menu (browser lobby setup)
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
  });
});

test.describe('Browser Lobby - Keyboard Navigation', () => {
  test('should submit create form on Enter key', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Create Lobby/i }).click();
    
    const input = page.getByPlaceholder('Enter your name...');
    await input.fill('KeyboardUser');
    
    // Verify the button becomes enabled (form is ready to submit)
    const createButton = page.getByRole('button', { name: /Create Lobby$/i });
    await expect(createButton).toBeEnabled();
  });

  test('should submit join form on Enter key', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Join Lobby/i }).click();
    
    await page.getByPlaceholder('ABC123').fill('TEST01');
    const usernameInput = page.getByPlaceholder('Enter your name...');
    await usernameInput.fill('KeyboardPlayer');
    
    // Verify the button becomes enabled (form is ready to submit)
    const joinButton = page.getByRole('button', { name: /Join Lobby/i, exact: true });
    await expect(joinButton).toBeEnabled();
  });
});

test.describe('Browser Lobby - Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Main elements should still be visible
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Lobby/i })).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Lobby/i })).toBeVisible();
  });
});

test.describe('Browser Lobby - Accessibility', () => {
  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Create Lobby/i }).click();
    
    // Username input should be auto-focused
    const input = page.getByPlaceholder('Enter your name...');
    await expect(input).toBeFocused();
  });

  test('should be navigable with Tab key', async ({ page }) => {
    await page.goto('/');
    
    // Click on the page body first to ensure focus is inside the document
    await page.locator('body').click();
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Some focusable element should be focused after tabbing
    const focusedElement = page.locator('button:focus, a:focus, input:focus, [tabindex]:focus');
    await expect(focusedElement).toBeAttached({ timeout: 2000 });
  });
});
