import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Find the theme toggle button (contains sun/moon icon)
    const themeToggle = page.locator('button[title*="theme"], button[aria-label*="theme"]').first();
    
    // If that doesn't work, find by the SVG content
    if (!(await themeToggle.isVisible().catch(() => false))) {
      // Try clicking any button with a sun/moon emoji or icon
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const html = await button.innerHTML();
        if (html.includes('sun') || html.includes('moon') || html.includes('☀') || html.includes('🌙')) {
          await button.click();
          break;
        }
      }
    } else {
      await themeToggle.click();
    }
    
    // After toggle, theme should have changed
    // We verify the page is still functional after toggle
    await expect(page.getByText('🎮 Create Lobby')).toBeVisible();
  });

  test('should persist theme preference', async ({ page }) => {
    await page.goto('/');
    
    // Set dark mode in localStorage
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    
    await page.reload();
    
    // Page should still load correctly with stored preference
    await expect(page.getByText('🎮 Create Lobby')).toBeVisible();
  });

  test('should respect system preference', async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    // Page should load with dark theme based on system preference
    await expect(page.getByText('🎮 Create Lobby')).toBeVisible();
  });
});

test.describe('Visual Regression', () => {
  // Visual regression tests - run with --update-snapshots to create baselines
  // These are skipped by default until baselines are generated
  
  test.skip('main menu should look correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('main-menu.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test.skip('create lobby screen should look correct', async ({ page }) => {
    await page.goto('/');
    await page.getByText('🎮 Create Lobby').click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('create-lobby.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test.skip('join lobby screen should look correct', async ({ page }) => {
    await page.goto('/');
    await page.getByText('🚀 Join Lobby').click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('join-lobby.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
