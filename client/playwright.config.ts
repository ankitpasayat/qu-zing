import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Qu-Zing! browser client
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Use more workers locally for faster runs */
  workers: process.env.CI ? 2 : undefined,
  
  /* Timeout for each test */
  timeout: 15000,
  
  /* Reporter to use */
  reporter: process.env.CI 
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }], ['list']],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Faster action timeout */
    actionTimeout: 10000,
  },

  /* Only test Chromium - Desktop and Mobile viewports covered in tests */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
