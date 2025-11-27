import { test, expect } from '@playwright/test';

/**
 * These tests verify the lobby screen after a player has created/joined a game.
 * Note: These tests require mocking the WebSocket connection since we can't
 * actually connect to a real server in E2E tests without the full backend.
 * 
 * For now, we test what we can without a real backend connection.
 */

test.describe('Game Lobby - Visual Elements', () => {
  // Skip these tests if no backend is available
  // In a real CI environment, you'd spin up the backend first
  
  test.skip('should show loading state when joining game', async ({ page }) => {
    await page.goto('/');
    await page.getByText('🎮 Create Lobby').click();
    await page.getByPlaceholder('Enter your name...').fill('TestHost');
    await page.getByRole('button', { name: 'Create Lobby' }).click();
    
    // Should show joining/loading state
    await expect(page.getByText(/Joining game|Loading|Connecting/i)).toBeVisible();
  });
});

test.describe('Static Pages', () => {
  test('should load analytics page', async ({ page }) => {
    await page.goto('/analytics');
    
    // Analytics page should load (may require auth in real scenario)
    await expect(page).toHaveURL(/analytics/);
  });

  test('should load terms of service page', async ({ page }) => {
    await page.goto('/terms-of-service');
    await expect(page).toHaveURL(/terms/);
  });

  test('should load privacy policy page', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page).toHaveURL(/privacy/);
  });
});
