# Testing Documentation

This directory contains the test suite for the DoS/DDoS Attack Simulator.

## Test Structure

```
tests/
├── core/               # Unit tests for core engine (GameLoop, Orchestrator, CanvasRenderer)
├── models/             # Unit tests for business logic (Packet, Server, Attacker, etc.)
├── ui/                 # Tests for UI components (UIManager, EventHandlers)
├── integration/        # Integration tests (performance, mitigation scenarios)
├── visual/             # Playwright visual regression tests
└── README.md          # This file
```

## Running Tests

### Unit & Integration Tests (Vitest)

Run all unit and integration tests:

```bash
npm test
```

Run tests in watch mode (for development):

```bash
npm test -- --watch
```

Run a specific test file:

```bash
npm test -- tests/core/trajectory.test.js
```

### Visual Regression Tests (Playwright)

Visual tests verify that:
1. Particles follow correct paths from source to destination nodes
2. Node clusters render multiple circles for deviceCount > 1
3. Canvas space is properly utilized (attacker above, legit below centerline)
4. Debug overlays work when test hooks are enabled

#### Prerequisites

Install Playwright browsers (first time only):

```bash
npx playwright install --with-deps chromium
```

#### Running Visual Tests

Run all visual tests:

```bash
npm run test:visual
```

Run tests in headed mode (see browser):

```bash
npm run test:visual:headed
```

Run tests with Playwright inspector (debugging):

```bash
npm run test:visual:debug
```

Update snapshots (when intentional visual changes are made):

```bash
npm run test:visual:update
```

#### Local Development Server

Visual tests need a running HTTP server. The test config automatically starts one, but you can also run it manually:

```bash
npm run serve
```

Then in another terminal:

```bash
TEST_TARGET_URL=http://localhost:8080 npm run test:visual
```

## MCP Server Integration

The visual tests support uploading screenshots to an MCP (Model Context Protocol) server for visual diff comparison.

### Setting Up MCP Server URL

#### Local Development

Set the environment variable before running tests:

```bash
export MCP_SERVER_URL=https://your-mcp-server.example.com
npm run test:visual
```

Or inline:

```bash
MCP_SERVER_URL=https://your-mcp-server.example.com npm run test:visual
```

#### GitHub Actions (CI)

Add `MCP_SERVER_URL` as a repository secret:

1. Go to your repository settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `MCP_SERVER_URL`
5. Value: Your MCP server URL (e.g., `https://your-mcp-server.example.com`)
6. Click "Add secret"

The GitHub Actions workflow will automatically use this secret when running visual tests.

### MCP Server Behavior

- **With MCP_SERVER_URL set**: Screenshots are uploaded to the MCP server for diff comparison
- **Without MCP_SERVER_URL**: Tests fall back to Playwright's built-in snapshot comparison using stored golden images

### MCP Upload Format

Screenshots are uploaded as JSON:

```json
{
  "testName": "packet-trajectory",
  "screenshot": "<base64-encoded-png>",
  "timestamp": "2026-01-08T17:00:00.000Z"
}
```

Expected response:

```json
{
  "success": true,
  "diffUrl": "https://mcp-server/diffs/packet-trajectory-123",
  "diffPercentage": 0.02
}
```

## Test Coverage

### Core Engine Tests
- **GameLoop**: Frame timing, delta time calculation, pause/resume
- **Orchestrator**: Particle spawning, trajectory computation, inspection logic
- **CanvasRenderer**: Drawing shapes, colors, cluster visualization, debug overlay

### Model Tests
- **Packet**: Construction, properties, velocity vectors
- **Server**: Load calculation, status thresholds, happiness score
- **Attacker**: Botnet generation, packet spawning, traffic weight
- **Firewall**: Protocol blocking, IP filtering, rate limiting
- **GenuineTraffic**: Legitimate user simulation

### UI Tests
- **UIManager**: DOM updates, health bars, logs, status indicators
- **EventHandlers**: Button clicks, slider interactions, form submissions

### Integration Tests
- **Performance**: FPS targets, particle caps, visual scaling
- **Mitigation**: Complete attack scenarios with different mitigation strategies

### Visual Tests
- **Packet Trajectory**: Particles follow node-to-destination paths
- **Cluster Rendering**: Multi-device visualization with cluster dots
- **Canvas Layout**: Proper use of vertical space (attacker top, legit bottom)
- **Debug Overlay**: Test hooks show spawn points and velocity vectors

## Writing New Tests

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest';
import MyClass from '../js/models/MyClass.js';

describe('MyClass', () => {
  it('should do something', () => {
    const instance = new MyClass();
    expect(instance.someMethod()).toBe(expectedValue);
  });
});
```

### Visual Test Example

```javascript
import { test, expect } from '@playwright/test';

test('visual check for new feature', async ({ page }) => {
  await page.goto('/');
  await page.click('#some-button');
  await page.waitForTimeout(1000);
  
  const canvas = await page.locator('canvas').first();
  const screenshot = await canvas.screenshot();
  
  await expect(screenshot).toMatchSnapshot('new-feature.png');
});
```

## Debugging Failed Tests

### Unit Tests

Run with verbose output:

```bash
npm test -- --reporter=verbose
```

### Visual Tests

When a visual test fails:

1. Check the HTML report:
   ```bash
   npx playwright show-report
   ```

2. Review screenshots in `test-results/` directory

3. Update snapshots if the change is intentional:
   ```bash
   npm run test:visual:update
   ```

4. Debug interactively:
   ```bash
   npm run test:visual:debug
   ```

## CI/CD Integration

Visual tests run automatically on:
- Pushes to `main` branch
- Pushes to `copilot/**` branches
- Pull requests targeting `main`

View results:
1. Go to the Actions tab in GitHub
2. Click on the latest workflow run
3. Download artifacts (playwright-report, test-results)

## Performance Notes

- Visual tests are slower than unit tests (~10-30s per test)
- Limit the number of visual tests to critical user journeys
- Use pixel sampling instead of full image comparison when possible
- Keep test timeout reasonable (30s default)

## Troubleshooting

### "Browser not found" error

Install Playwright browsers:

```bash
npx playwright install --with-deps chromium
```

### Visual tests fail with "Snapshot mismatch"

This can happen due to:
- Font rendering differences between systems
- Anti-aliasing variations
- Intentional code changes

Solutions:
1. Review the diff in the HTML report
2. If expected, update snapshots: `npm run test:visual:update`
3. Adjust threshold in `playwright.config.js` if needed

### MCP upload fails

Check:
1. `MCP_SERVER_URL` is set correctly
2. Network connectivity to MCP server
3. MCP server is accepting uploads

Tests will fall back to local snapshot comparison if MCP fails.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Project SPEC.md](../SPEC.md) - Behavioral specification
- [Project README.md](../README.md) - General information
