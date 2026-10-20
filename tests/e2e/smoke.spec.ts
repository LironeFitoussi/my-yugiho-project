import { expect, test } from "@playwright/test";

// Unauthenticated smoke checks. Runs on every project in playwright.config.ts (desktop + iphone).
test.describe("unauthenticated smoke", () => {
  test("home redirects to the login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("login page offers Google sign-in", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });

  test("web app manifest is public JSON with a name and icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as { name?: unknown; icons?: unknown };
    expect(typeof manifest.name).toBe("string");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  test("health endpoint is public and reports a status", async ({ request }) => {
    const res = await request.get("/api/health", { maxRedirects: 0 });
    expect(res.status()).not.toBe(307);
    const body = (await res.json()) as { status?: unknown };
    expect(typeof body.status).toBe("string");
  });
});
