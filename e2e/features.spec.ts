import { test, expect, type Page, type Route } from "@playwright/test";

// ── Shared API mock helpers ────────────────────────────────────────────────────

/** Mock /api/auth/me to simulate a logged-out visitor */
async function mockLoggedOut(page: Page) {
  await page.route("**/api/auth/me", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ loggedIn: false }) })
  );
}

/** Mock /api/auth/me to simulate an authenticated user */
async function mockLoggedIn(page: Page) {
  await page.route("**/api/auth/me", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ loggedIn: true, email: "test@example.com" }),
    })
  );
}

/** Mock /api/usage to return a free-plan usage payload */
async function mockUsageFree(page: Page) {
  await page.route("**/api/usage", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: "free",
        sessionsToday: 1,
        sessionLimit: 3,
        voiceSecondsToday: 60,
        voiceLimit: 300,
      }),
    })
  );
}

/** Mock /api/usage to return 401 (unauthenticated) */
async function mockUsageUnauthorized(page: Page) {
  await page.route("**/api/usage", (route: Route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) })
  );
}

// ── 1. Free Scenario Mode ──────────────────────────────────────────────────────

test.describe("Free Scenario Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Dashboard is a server component that redirects unauthenticated users.
    // We stub the auth cookie check via the /api/ layer used by client components
    // and navigate to dashboard directly (dev server must be running).
    await mockLoggedIn(page);
    await mockUsageFree(page);
  });

  test('shows "Free Scenario" tab on dashboard', async ({ page }) => {
    await page.goto("/dashboard");

    const freeScenarioTab = page.getByRole("button", { name: "Free Scenario" });
    await expect(freeScenarioTab).toBeVisible();
  });

  test("clicking Free Scenario tab reveals the scenario form", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Free Scenario" }).click();

    await expect(page.getByText("Create Your Scenario")).toBeVisible();
  });

  test("shows character count and error when input is shorter than 20 characters", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    const textarea = page.locator("textarea");
    await textarea.fill("Too short");

    // Character counter should reflect current length
    await expect(page.getByText(/9\/500/)).toBeVisible();

    // Helper message: "X more characters needed"
    await expect(page.getByText(/more characters needed/)).toBeVisible();
  });

  test("Start Conversation button is disabled when input is too short", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    const textarea = page.locator("textarea");
    await textarea.fill("Short");

    const startButton = page.getByRole("button", { name: /Start Conversation/i });
    await expect(startButton).toBeDisabled();
  });

  test("Start Conversation button becomes enabled with at least 20 characters", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    const textarea = page.locator("textarea");
    const validScenario =
      "I am applying for a software engineer job at a startup and the interviewer is tough.";
    await textarea.fill(validScenario);

    const startButton = page.getByRole("button", { name: /Start Conversation/i });
    await expect(startButton).toBeEnabled();
  });

  test("clicking Start Conversation shows loading state while API call is in-flight", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    // Stub the scenario generate API to hang long enough to observe loading state
    await page.route("**/api/scenario/generate", async (route) => {
      // Delay the response so the loading indicator is visible
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          character: {
            name: "Alex",
            role: "Interviewer",
            personality: "Strict but fair",
            systemPrompt: "You are a tough interviewer.",
          },
        }),
      });
    });

    const textarea = page.locator("textarea");
    await textarea.fill(
      "I am applying for a software engineer job at a startup and the interviewer is tough."
    );

    const startButton = page.getByRole("button", { name: /Start Conversation/i });
    await startButton.click();

    // Loading indicator should appear before API resolves
    await expect(page.getByText(/Creating your scenario character/i)).toBeVisible();
  });

  test("shows error message when API returns an error", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    await page.route("**/api/scenario/generate", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Could not generate character. Please try again." }),
      })
    );

    const textarea = page.locator("textarea");
    await textarea.fill(
      "I am applying for a software engineer job at a startup and the interviewer is tough."
    );

    await page.getByRole("button", { name: /Start Conversation/i }).click();

    await expect(page.getByText(/Could not generate character/i)).toBeVisible();
  });

  test("free plan banner is visible inside scenario form", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Free Scenario" }).click();

    await expect(page.getByText(/Free plan: 2-minute conversation/i)).toBeVisible();
  });
});

// ── 2. UsageBar ────────────────────────────────────────────────────────────────

test.describe("UsageBar", () => {
  test("UsageBar is NOT rendered for unauthenticated visitors on the dashboard", async ({
    page,
  }) => {
    // When /api/usage returns 401, UsageBar renders nothing (returns null)
    await mockUsageUnauthorized(page);

    await page.goto("/dashboard");

    // UsageBar identifies itself via the fixed bottom bar with "Sessions:" text
    await expect(page.getByText(/Sessions:/)).not.toBeVisible();
  });

  test("UsageBar is visible at the bottom of dashboard for authenticated users", async ({
    page,
  }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    const usageBar = page.getByText(/Sessions:/);
    await expect(usageBar).toBeVisible();
  });

  test("UsageBar shows correct session count for free plan", async ({ page }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    // Mock returns sessionsToday=1 and sessionLimit=3
    await expect(page.getByText(/1\/3 today/)).toBeVisible();
  });

  test("UsageBar shows voice remaining time for free plan", async ({ page }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    // Mock returns voiceSecondsToday=60 and voiceLimit=300 → 240s remaining → 4:00
    await expect(page.getByText(/4:00 remaining/)).toBeVisible();
  });

  test("UsageBar shows Upgrade to Pro CTA for free plan users", async ({ page }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: /Upgrade to Pro/i })).toBeVisible();
  });

  test("UsageBar Upgrade link points to /dashboard#plans", async ({ page }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    const upgradeLink = page.getByRole("link", { name: /Upgrade to Pro/i });
    await expect(upgradeLink).toHaveAttribute("href", "/dashboard#plans");
  });

  test("UsageBar shows Premium badge for premium plan users", async ({ page }) => {
    await page.route("**/api/usage", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: "premium",
          sessionsToday: 5,
          sessionLimit: Infinity,
          voiceSecondsToday: 0,
          voiceLimit: Infinity,
        }),
      })
    );

    await page.goto("/dashboard");

    await expect(page.getByText(/Premium/)).toBeVisible();
  });

  test("UsageBar is fixed to the bottom of the viewport", async ({ page }) => {
    await mockUsageFree(page);

    await page.goto("/dashboard");

    const bar = page
      .locator("div.fixed.bottom-0")
      .filter({ hasText: "Sessions:" });
    await expect(bar).toBeVisible();
  });
});

// ── 3. i18n — Language Switcher ────────────────────────────────────────────────

test.describe("i18n — LanguageSwitcher", () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedOut(page);
  });

  test("LanguageSwitcher trigger button is visible on the landing page", async ({ page }) => {
    await page.goto("/");

    const switcher = page.getByRole("button", { name: /Select language/i });
    await expect(switcher).toBeVisible();
  });

  test("LanguageSwitcher opens a language dropdown when clicked", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select language/i }).click();

    // Dropdown should list at least English
    await expect(page.getByRole("option", { name: /English/i })).toBeVisible();
  });

  test("LanguageSwitcher lists all supported languages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select language/i }).click();

    for (const lang of ["English", "Español", "Deutsch", "Français", "Türkçe"]) {
      await expect(page.getByRole("option", { name: lang })).toBeVisible();
    }
  });

  test("selecting a language triggers a page reload", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select language/i }).click();

    // Wait for dropdown then click Türkçe and assert navigation/reload happens
    const [navigation] = await Promise.all([
      page.waitForNavigation({ waitUntil: "load", timeout: 10000 }),
      page.getByRole("option", { name: /Türkçe/i }).click(),
    ]);

    // After reload the page should still be on "/" (same origin)
    expect(page.url()).toContain("localhost:3000");
  });

  test("LanguageSwitcher closes when clicking outside the dropdown", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select language/i }).click();
    await expect(page.getByRole("listbox")).toBeVisible();

    // Click somewhere outside the dropdown
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    await expect(page.getByRole("listbox")).not.toBeVisible();
  });

  test("LanguageSwitcher button has correct aria-haspopup and aria-expanded attributes", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /Select language/i });

    // Before opening
    await expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();

    // After opening
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

// ── 4. Hero Video ──────────────────────────────────────────────────────────────

test.describe("Hero Video", () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedOut(page);
  });

  test("hero video element is present on the landing page", async ({ page }) => {
    await page.goto("/");

    const video = page.locator("video").first();
    await expect(video).toBeAttached();
  });

  test("hero video has autoPlay attribute", async ({ page }) => {
    await page.goto("/");

    // Playwright exposes autoplay as a DOM property; check via attribute or evaluate
    const hasAutoplay = await page.locator("video").first().evaluate((el) => {
      return (el as HTMLVideoElement).autoplay;
    });
    expect(hasAutoplay).toBe(true);
  });

  test("hero video has muted attribute", async ({ page }) => {
    await page.goto("/");

    const isMuted = await page.locator("video").first().evaluate((el) => {
      return (el as HTMLVideoElement).muted;
    });
    expect(isMuted).toBe(true);
  });

  test("hero video has a valid MP4 source", async ({ page }) => {
    await page.goto("/");

    const src = await page
      .locator("video source[type='video/mp4']")
      .first()
      .getAttribute("src");

    expect(src).toBeTruthy();
    expect(src).toContain(".mp4");
  });

  test("hero video section is within the #how-it-works section", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("#how-it-works");
    await expect(section).toBeVisible();

    const video = section.locator("video");
    await expect(video).toBeAttached();
  });

  test("play/pause button is visible on hover over the video", async ({ page }) => {
    await page.goto("/");

    const videoWrapper = page.locator("#how-it-works .group").first();
    await videoWrapper.hover();

    // The overlay button becomes visible on hover (opacity-100 via group-hover)
    const playPauseOverlay = videoWrapper.locator("div.w-16.h-16");
    await expect(playPauseOverlay).toBeVisible();
  });
});
