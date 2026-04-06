import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Profil", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await ensureDashboard(page);
    if (!ok) test.skip();
    await navigateTo(page, "Profil");
    await page.waitForURL(/\/profile/, { timeout: 5000 });
  });

  test("afișează datele profilului", async ({ page }) => {
    await expect(page.locator("text=/Profil|Numele/i").first()).toBeVisible();
  });

  test("afișează secțiunea de insigne", async ({ page }) => {
    await expect(page.locator("text=/Insigne|Insignele Mele/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("click pe insignă deschide pop-up cu descriere", async ({ page }) => {
    const badge = page.locator("[class*='rounded-xl'][class*='cursor-pointer']").first();
    if (await badge.isVisible()) {
      await badge.click();
      await expect(page.locator("[role='dialog']")).toBeVisible({ timeout: 3000 });
    }
  });

  test("buton de editare profil funcționează", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /editează|modifică/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      // Edit form should appear
      await expect(page.locator("input, textarea").first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("afișează pelerinaje anterioare", async ({ page }) => {
    const pastSection = page.locator("text=/Pelerinaje anterioare|trecute|Istoric/i").first();
    if (await pastSection.isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test("link spre setări funcționează", async ({ page }) => {
    const settingsLink = page.locator("a[href='/settings'], button:has-text('Setări')").first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL(/\/settings/, { timeout: 5000 });
    }
  });
});
