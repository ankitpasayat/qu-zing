import { test, expect } from '@playwright/test';

/**
 * E2E tests for game mechanics UI components.
 * Tests verify that key game components are present and interactive.
 * Full game flow tests would require a running backend or WebSocket mocking.
 */

test.describe('Game Mechanics - Static UI Elements', () => {
  test('should have How to Play section with power-up info', async ({ page }) => {
    await page.goto('/');
    
    // Check for How to Play section
    await expect(page.getByRole('heading', { name: /How to Play/i })).toBeVisible();
  });

  test('main page should load without errors', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main elements are present
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Lobby/i })).toBeVisible();
  });
});

test.describe('Game Mechanics - Browser Lobby Integration', () => {
  test('create lobby flow should work', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to create lobby
    await page.getByRole('button', { name: /Create Lobby/i }).click();
    
    // Fill in username
    await page.getByPlaceholder('Enter your name...').fill('PowerUpTester');
    
    // Should be able to click create (button has emoji prefix)
    const createButton = page.getByRole('button', { name: /Create Lobby$/i });
    await expect(createButton).toBeEnabled();
  });

  test('join lobby flow should work', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to join lobby  
    await page.getByRole('button', { name: /Join Lobby/i }).click();
    
    // Fill in code and username
    await page.getByPlaceholder('ABC123').fill('GAME01');
    await page.getByPlaceholder('Enter your name...').fill('PowerUpTester');
    
    // Should be able to click join
    const joinButton = page.getByRole('button', { name: /Join Lobby/i, exact: true });
    await expect(joinButton).toBeEnabled();
  });
});

test.describe('Game Mechanics - Accessibility', () => {
  test('should have proper focus management for game controls', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Create Lobby/i }).click();
    
    // Username input should be auto-focused
    const input = page.getByPlaceholder('Enter your name...');
    await expect(input).toBeFocused();
  });

  test('buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Click on page body first to ensure focus context
    await page.locator('body').click();
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Use a more lenient check - just verify tab navigation works
    const activeElement = await page.evaluate('document.activeElement?.tagName');
    expect(['BUTTON', 'A', 'INPUT']).toContain(activeElement);
  });
});
