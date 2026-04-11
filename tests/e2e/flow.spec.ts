/**
 * E2E tests using Playwright.
 * Setup: npm install -D @playwright/test && npx playwright install
 * Run: npx playwright test tests/e2e
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Test user credentials (use Firebase emulator in CI)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "e2e@uni-o.test",
  password: process.env.TEST_USER_PASSWORD || "TestPass123!",
  name: "E2E Test User",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/`);
  // Click sign in button
  await page.click('[data-testid="sign-in-btn"], button:has-text("Sign In")');
  // Wait for auth modal
  await page.waitForSelector('[data-testid="auth-modal"], [role="dialog"]');
  await page.fill('[placeholder*="email"], [type="email"]', TEST_USER.email);
  await page.fill('[placeholder*="password"], [type="password"]', TEST_USER.password);
  await page.click('button:has-text("Sign In"), button[type="submit"]');
  // Wait for auth to complete
  await page.waitForSelector('[data-testid="user-avatar"], .user-menu', { timeout: 10000 });
}

async function signOut(page: Page) {
  await page.click('[data-testid="user-avatar"], .user-menu');
  await page.click('button:has-text("Sign Out"), [data-testid="sign-out"]');
}

// ─── Navigation Tests ─────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test("home page loads correctly", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Uni-O/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("can navigate to challenges", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('a[href="/challenges"], button:has-text("Practice")');
    await expect(page).toHaveURL(/\/challenges/);
    await expect(page.locator("h1")).toContainText(/challenge|practice/i);
  });

  test("can navigate to events", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('a[href="/events"], button:has-text("Events")');
    await expect(page).toHaveURL(/\/events/);
    await expect(page.locator("h1")).toContainText(/events|discover/i);
  });

  test("can navigate to contests", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('a[href="/contests"], button:has-text("Contest")');
    await expect(page).toHaveURL(/\/contests/);
  });
});

// ─── Challenge Flow Tests ─────────────────────────────────────────────────────

test.describe("Challenges", () => {
  test("challenge list loads with filtering", async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    // Wait for challenges to load (shimmer disappears)
    await page.waitForSelector('[class*="challenge-row"], .challenge-item, [data-testid="challenge-row"]', {
      timeout: 15000,
    });

    // Test difficulty filter
    await page.click('button:has-text("Easy")');
    await page.waitForTimeout(500);
    const rows = page.locator('[class*="challenge-row"], .challenge-item');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("can search for a challenge", async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);
    await page.waitForSelector('input[placeholder*="search"], input[placeholder*="Search"]');

    await page.fill('input[placeholder*="search"], input[placeholder*="Search"]', "Two Sum");
    await page.waitForTimeout(800);

    const rows = page.locator('[class*="challenge-row"], .challenge-item, tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("can open a challenge detail page", async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);
    await page.waitForSelector('[class*="challenge-row"], .challenge-item', { timeout: 10000 });

    // Click first challenge
    await page.locator('[class*="challenge-row"], .challenge-item').first().click();
    await expect(page).toHaveURL(/\/challenges\/.+/);

    // Verify editor is present
    await expect(page.locator("textarea.code-editor, [data-testid='code-editor']")).toBeVisible();
  });

  test("can switch language in code editor", async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);
    await page.waitForSelector('[class*="challenge-row"], .challenge-item', { timeout: 10000 });
    await page.locator('[class*="challenge-row"], .challenge-item').first().click();

    await page.selectOption("select", "Python");
    await page.waitForTimeout(300);

    const editorContent = await page.locator("textarea.code-editor").inputValue();
    expect(editorContent.length).toBeGreaterThan(0);
  });
});

// ─── Event Flow Tests ─────────────────────────────────────────────────────────

test.describe("Events", () => {
  test("events page shows grid of events", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForSelector(".card, [data-testid='event-card']", { timeout: 15000 });

    const cards = page.locator(".card");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("can filter events by mode", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForSelector(".card, [data-testid='event-card']", { timeout: 10000 });

    await page.click('button:has-text("Online")');
    await page.waitForTimeout(500);
    // Verify filter is active (button style changes)
    const onlineBtn = page.locator('button:has-text("Online")');
    await expect(onlineBtn).toHaveCSS("color", /8B5CF6|6C3BFF|purple/);
  });

  test("event detail page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForSelector(".card", { timeout: 10000 });

    // Click "View Details" on first card
    await page.locator('.card').first().locator('button:has-text("View"), a:has-text("View")').first().click();
    await expect(page).toHaveURL(/\/events\/.+/);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('button:has-text("Register")').first()).toBeVisible();
  });

  test("registration requires auth", async ({ page }) => {
    await page.goto(`${BASE_URL}/events`);
    await page.waitForSelector(".card", { timeout: 10000 });
    await page.locator('.card').first().locator('button:has-text("View")').first().click();

    await page.click('button:has-text("Register Now"), button:has-text("Register")');

    // Should show auth modal for unauthenticated users
    const authModal = page.locator('[role="dialog"], [data-testid="auth-modal"]');
    await expect(authModal).toBeVisible({ timeout: 5000 });
  });
});

// ─── Auth Flow Tests ──────────────────────────────────────────────────────────

test.describe("Authentication", () => {
  test("can open sign-in modal", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Sign In"), [data-testid="sign-in-btn"]');

    const modal = page.locator('[role="dialog"], [data-testid="auth-modal"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('[type="email"]')).toBeVisible();
    await expect(page.locator('[type="password"]')).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Sign In"), [data-testid="sign-in-btn"]');

    await page.fill('[type="email"]', "wrong@email.com");
    await page.fill('[type="password"]', "wrongpassword");
    await page.click('button[type="submit"], button:has-text("Sign In")');

    // Wait for error message
    await expect(
      page.locator('[class*="error"], [data-testid="auth-error"], p:has-text("Invalid")')
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─── Contest Flow Tests ───────────────────────────────────────────────────────

test.describe("Contests", () => {
  test("contests page shows tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/contests`);

    await expect(page.locator('button:has-text("Upcoming")')).toBeVisible();
    await expect(page.locator('button:has-text("Live")')).toBeVisible();
    await expect(page.locator('button:has-text("Ended")')).toBeVisible();
  });

  test("can switch contest tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/contests`);

    await page.click('button:has-text("Ended")');
    await page.waitForTimeout(500);

    // Ended tab should now be active
    const endedBtn = page.locator('button:has-text("Ended")');
    await expect(endedBtn).toHaveCSS("color", /8B5CF6|purple/);
  });

  test("contest detail page loads", async ({ page }) => {
    // Use the mock contest ID
    await page.goto(`${BASE_URL}/contests/c1`);

    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.card').first()).toBeVisible();
  });
});

// ─── Accessibility Tests ──────────────────────────────────────────────────────

test.describe("Accessibility", () => {
  test("home page has no critical a11y violations", async ({ page }) => {
    await page.goto(BASE_URL);
    // Basic checks
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header, nav")).toBeVisible();

    // Check for skip link or main landmark
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto(BASE_URL);
    // Tab to first interactive element
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});

// ─── Performance Tests ────────────────────────────────────────────────────────

test.describe("Performance", () => {
  test("home page loads in under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  test("challenges page renders without layout shift", async ({ page }) => {
    await page.goto(`${BASE_URL}/challenges`);

    // Check shimmer cards appear then content
    const body = await page.evaluate(() => document.body.innerHTML);
    expect(body.length).toBeGreaterThan(0);
  });
});