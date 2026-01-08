import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for visual regression testing
 * 
 * Environment variables:
 * - TEST_TARGET_URL: URL to test against (defaults to http://localhost:8080)
 * - MCP_SERVER_URL: MCP server URL for visual diff uploads (optional)
 */
export default defineConfig({
  testDir: './tests/visual',
  
  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
    toMatchSnapshot: {
      threshold: 0.2, // Allow 20% pixel difference for anti-aliasing
      maxDiffPixels: 100
    }
  },

  // Fail fast in CI
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter config
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // Test output
  outputDir: 'test-results/',

  use: {
    // Base URL for tests
    baseURL: process.env.TEST_TARGET_URL || 'http://localhost:8080',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    
    // Viewport
    viewport: { width: 1400, height: 900 },
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  // Web server for local testing
  webServer: process.env.TEST_TARGET_URL ? undefined : {
    command: 'npx http-server . -p 8080 -c-1',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
