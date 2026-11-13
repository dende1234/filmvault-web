import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Pages anyone can open. Each must render and have no serious or critical
// accessibility problems (axe-core, WCAG 2 A/AA).
const PAGES = ["/voorbeeld", "/login", "/register", "/gids", "/privacy", "/feedback"];

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


test("sample collection can be filtered and demonstrates shopping without an account", async ({ page }) => {
  await page.goto("/voorbeeld");
  await page.getByRole("textbox").fill("Inception");
  await expect(page.getByText("Inception", { exact: true })).toBeVisible();
  await expect(page.getByText("The Matrix", { exact: true })).not.toBeVisible();
  await page.getByRole("tab", { name: /Winkelmodus|Shop mode/i }).click();
  await page.getByRole("button", { name: /Simuleer een scan|Simulate a scan/i }).click();
  await expect(page.getByRole("status")).toContainText(/Deze editie heb je al|You already own this edition/);
  await expect(page).toHaveURL(/\/voorbeeld/);
});
