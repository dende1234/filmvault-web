import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Pages anyone can open. Each must render and have no serious or critical
// accessibility problems (axe-core, WCAG 2 A/AA).
const PAGES = ["/login", "/register", "/gids", "/privacy", "/feedback"];

for (const path of PAGES) {
  test(`${path} renders and is accessible`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `status of ${path}`).toBeLessThan(400);
    await expect(page.locator("main, form, h1").first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}× ${v.help}`)).toEqual([]);
  });
}

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
