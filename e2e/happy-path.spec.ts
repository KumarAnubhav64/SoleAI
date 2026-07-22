import { test, expect } from '@playwright/test';

/**
 * E2E happy path test for the SoleAI Remote Field Technician Support Portal.
 *
 * Tests the complete flow: config → prep → activity → performance
 * by verifying page rendering, navigation, and key UI components.
 *
 * Detailed chat interaction (scoping, QA) is tested via Vitest unit tests.
 * Media recording is tested via unit tests.
 * This E2E test focuses on things unit tests can't cover:
 *   - Page routing & navigation
 *   - Layout & key component rendering
 *   - Route protection
 *   - Global navigation bar
 */

test.describe('Full Happy Path', () => {
  /**
   * Step 1: Home → Configure job → Navigate to Prep
   */
  test('Phase 1-2: Job config → Prep briefing page', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await expect(page).toHaveTitle(/SoleAI/);
    await expect(
      page.getByRole('heading', { name: /Job Configuration/i }),
    ).toBeVisible();

    // Verify NavigationBar shows Phase 1
    await expect(page.getByText(/Phase 1\/4/i)).toBeVisible();

    // Select equipment + severity
    await page.getByText('HVAC System').click();
    await page.getByText('Critical Fault').click();

    // Click Start Mission
    const startBtn = page.getByRole('button', { name: /Start Mission/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Verify navigation to /prep
    await page.waitForURL('**/prep', { timeout: 15_000 });
    await expect(page.getByText(/Safety Instructions/i)).toBeVisible();
    await expect(page.getByText(/Skip & Proceed/i)).toBeVisible();
    await expect(page.getByText(/Time remaining/i)).toBeVisible();

    // Verify NavigationBar updated to Phase 2
    await expect(page.getByText(/Phase 2\/4/i)).toBeVisible();
  });

  /**
   * Step 2: Prep → Skip → Activity workspace
   */
  test('Phase 2-3: Prep briefing → Activity workspace', async ({
    page,
    context,
  }) => {
    // Set cookies to bypass route protection (start already at activity)
    const origin = 'http://localhost:3000';
    await context.addCookies([
      { name: 'configComplete', value: 'true', url: origin },
      { name: 'prepComplete', value: 'true', url: origin },
      { name: 'jobConfig', value: '{"equipmentType":"hvac","severity":"critical-fault"}', url: origin },
    ]);

    await page.goto('/activity');
    await page.waitForURL('**/activity', { timeout: 15_000 });

    // Verify the activity workspace layout renders
    await expect(page.getByText(/Remote Expert — Connected/i)).toBeVisible();

    // Verify tab headers
    await expect(
      page.getByRole('button', { name: /Scoping tab/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /Repair tab/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /QA tab/i }),
    ).toBeVisible();

    // Verify the chat panel renders with empty state
    await expect(
      page.getByText('Waiting for the Remote Expert to connect...'),
    ).toBeVisible({ timeout: 10_000 });

    // Verify the TTS Voice toggle is present
    await expect(page.getByText(/Voice/i)).toBeVisible();

    // Verify the global timer pill is visible
    await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();

    // ── Chat Interaction Test ──
    // First expert message should appear after mock delay (1.5-3s)
    // Use toBeAttached to handle Framer Motion's opacity animation
    await expect(
      page.getByText(/Hello, I'm your Remote Expert/i).first()
    ).toBeAttached({ timeout: 30_000 });

    // Simulate Speech button should become enabled when expert finishes typing
    await expect(
      page.getByTitle('Simulate speech-to-text')
    ).toBeEnabled({ timeout: 10_000 });

    // Send one user response via Simulate Speech
    await page.getByTitle('Simulate speech-to-text').click();

    // Verify the next expert message arrives in the DOM
    await expect(
      page.getByText(/visually inspect the unit/i)
    ).toBeAttached({ timeout: 20_000 });

    // Verify NavigationBar updated to Phase 3
    await expect(page.getByText(/Phase 3\/4/i)).toBeVisible();
  });

  /**
   * Step 3: Activity → Performance (bypass tabs via cookies)
   */
  test('Activity → Performance completion screen', async ({
    page,
    context,
  }) => {
    // Set all cookies to bypass route protection and simulate completion
    const origin = 'http://localhost:3000';
    await context.addCookies([
      { name: 'configComplete', value: 'true', url: origin },
      { name: 'prepComplete', value: 'true', url: origin },
      { name: 'tab1Complete', value: 'true', url: origin },
      { name: 'tab2Complete', value: 'true', url: origin },
      { name: 'tab3Complete', value: 'true', url: origin },
    ]);

    await page.goto('/performance');
    await page.waitForURL('**/performance', { timeout: 15_000 });

    // Verify the completion screen renders
    await expect(
      page.getByRole('heading', { name: /Mission Complete/i }),
    ).toBeVisible();

    // Verify job summary card
    await expect(page.getByText(/Job Summary/i)).toBeVisible();
    await expect(page.getByText(/3 \/ 3/i)).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();

    // Verify New Mission link
    const newMissionLink = page.getByText(/New Mission/i);
    await expect(newMissionLink).toBeVisible();
    await expect(newMissionLink).toHaveAttribute('href', '/');

    // Verify NavigationBar shows Phase 4
    await expect(page.getByText(/Phase 4\/4/i)).toBeVisible();
  });

  /**
   * Step 4: Route protection — verify blocked routes redirect correctly
   */
  test('Route protection blocks unauthorized access', async ({ page }) => {
    // Without cookies, /prep redirects to /
    await page.goto('/prep');
    await page.waitForURL('**/', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /Job Configuration/i }),
    ).toBeVisible();

    // Without cookies, /activity redirects to /
    await page.goto('/activity');
    await page.waitForURL('**/', { timeout: 10_000 });

    // Without cookies, /performance redirects to /
    await page.goto('/performance');
    await page.waitForURL('**/', { timeout: 10_000 });
  });
});
