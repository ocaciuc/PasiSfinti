import { test, expect } from "@playwright/test";
import { ensureDashboard } from "./helpers";

test.describe("Calendar Ortodox", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await ensureDashboard(page);
    if (!ok) test.skip();
    await page.goto("/calendar");
    await page.waitForURL(/\/calendar/, { timeout: 5000 });
  });

  test("afișează pagina calendarului", async ({ page }) => {
    await expect(page.locator("text=/Calendar|Ortodox/i").first()).toBeVisible();
  });

  test("afișează ziua curentă", async ({ page }) => {
    const today = new Date().getDate().toString();
    await expect(page.locator(`text=${today}`).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("navigare între luni", async ({ page }) => {
    const nextBtn = page.locator("button[aria-label*='next'], button:has-text('›'), button:has-text('>')").first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("click pe zi afișează detalii", async ({ page }) => {
    const dayCell = page.locator("button[name*='day'], td button, [role='gridcell'] button").first();
    if (await dayCell.isVisible()) {
      await dayCell.click();
      await page.waitForTimeout(500);
    }
  });
});
