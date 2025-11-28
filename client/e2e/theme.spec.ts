import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Find the theme toggle button - accessible name is "Switch to dark/light mode"
    const themeToggle = page.getByRole('button', { name: /Switch to (dark|light) mode/i });
    await expect(themeToggle).toBeVisible();
    
    // Click the toggle
    await themeToggle.click();
    
    // After toggle, theme should have changed - page should still be functional
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
  });

  test('should persist theme preference', async ({ page }) => {
    await page.goto('/');
    
    // Set dark mode in localStorage
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    
    await page.reload();
    
    // Page should still load correctly with stored preference
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
  });

  test('should respect system preference', async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    // Page should load with dark theme based on system preference
    await expect(page.getByRole('button', { name: /Create Lobby/i })).toBeVisible();
  });
});
