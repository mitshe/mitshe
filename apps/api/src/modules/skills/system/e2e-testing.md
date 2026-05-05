---
description: Playwright E2E testing best practices
allowed-tools: Bash(npx playwright:*), Bash(npm run test:*)
---

## E2E Testing with Playwright

You have Playwright and Chromium pre-installed. When browser is enabled, Chromium runs on DISPLAY :99 (visible to the user in real-time).

### Running tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run in headed mode (visible in browser tab)
npx playwright test --headed

# Run with debug inspector
npx playwright test --debug

# Run with trace recording
npx playwright test --trace on
```

### Writing tests

Use Page Object Model for complex flows:

```typescript
// tests/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

### Selectors priority

1. `getByRole()` — accessible roles (button, link, heading)
2. `getByLabel()` — form inputs
3. `getByText()` — visible text
4. `getByTestId()` — data-testid attributes
5. CSS selectors — last resort

### Assertions

```typescript
await expect(page).toHaveTitle(/Dashboard/);
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page).toHaveURL('/dashboard');
```

### Screenshots & traces

```typescript
// Screenshot on failure (automatic in config)
// Manual screenshot
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// View trace
npx playwright show-trace trace.zip
```

### Configuration (playwright.config.ts)

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```
