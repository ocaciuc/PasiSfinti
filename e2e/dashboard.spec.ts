import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await ensureDashboard(page);
    if (!ok) test.skip();
  });

  test("afișează dashboard-ul cu navigare", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
    expect(page.url()).toContain("/dashboard");
  });

  test("afișează widget-ul calendar ortodox", async ({ page }) => {
    await expect(page.locator("text=/Calendar|Sfânt|Sfinți/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("afișează lumânare activă sau info pelerinaj", async ({ page }) => {
    const candle = page.locator("text=/lumânare|arde|aprins/i").first();
    const pilgrimage = page.locator("text=/pelerinaj|următorul/i").first();
    const hasWidget = (await candle.isVisible().catch(() => false)) || (await pilgrimage.isVisible().catch(() => false));
    // At least one widget should be visible
    expect(hasWidget).toBeTruthy();
  });

  test("navigare la pelerinaje din dashboard", async ({ page }) => {
    await navigateTo(page, "Pelerinaje");
    await page.waitForURL(/\/pilgrimages/, { timeout: 5000 });
    expect(page.url()).toContain("/pilgrimages");
  });

  test("navigare la lumânare din dashboard", async ({ page }) => {
    await navigateTo(page, "Lumânare");
    await page.waitForURL(/\/candle/, { timeout: 5000 });
    expect(page.url()).toContain("/candle");
  });

  test("navigare la profil din dashboard", async ({ page }) => {
    await navigateTo(page, "Profil");
    await page.waitForURL(/\/profile/, { timeout: 5000 });
    expect(page.url()).toContain("/profile");
  });
});
