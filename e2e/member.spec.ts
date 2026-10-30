import { expect, test } from "@playwright/test";

// Needs a test member: E2E_EMAIL and E2E_PASSWORD (use a test Supabase
// project, these tests click through the real app).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("signed-in member", () => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(email!);
    await page.getByLabel(/wachtwoord|password/i).fill(password!);
    await page.getByRole("button", { name: /inloggen|log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("dashboard, search and the main pages open", async ({ page }) => {
    await page.keyboard.press("/");
    await expect(page.getByRole("combobox")).toBeVisible();
    await page.keyboard.press("Escape");
    for (const path of ["/collections", "/scannen", "/wishlist", "/statistieken", "/releases", "/meldingen", "/profile"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("scan page switches between its tabs", async ({ page }) => {
    await page.goto("/scannen");
    await page.getByRole("tab", { name: /meerdere|several/i }).click();
    await expect(page).toHaveURL(/modus=meerdere/);
    await page.getByRole("tab", { name: /winkel|shop/i }).click();
    await expect(page).toHaveURL(/modus=winkel/);
  });
});
