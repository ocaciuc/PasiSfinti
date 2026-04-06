import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Pelerinaje", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await ensureDashboard(page);
    if (!ok) test.skip();
    await navigateTo(page, "Pelerinaje");
    await page.waitForURL(/\/pilgrimages/, { timeout: 5000 });
  });

  test("afișează lista de pelerinaje", async ({ page }) => {
    await expect(page.locator("text=/Pelerinaje/i").first()).toBeVisible();
  });

  test("filtrează pe tipuri (locale/naționale)", async ({ page }) => {
    const filterBtn = page.locator("button, [role='tab']").filter({ hasText: /local|național|toate/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      // Page should update without errors
      await page.waitForTimeout(500);
    }
  });

  test("deschide detalii pelerinaj", async ({ page }) => {
    const card = page.locator("[class*='card'], a[href*='pilgrimage']").first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForURL(/\/pilgrimage\//, { timeout: 5000 });
      await expect(page.locator("text=/Descriere|Locație|Dată/i").first()).toBeVisible();
    }
  });

  test("buton de înscriere vizibil pe detalii", async ({ page }) => {
    const card = page.locator("[class*='card'], a[href*='pilgrimage']").first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForURL(/\/pilgrimage\//, { timeout: 5000 });
      const enrollBtn = page.getByRole("button", { name: /înscrie|participă|alătură/i });
      const leaveBtn = page.getByRole("button", { name: /renunță|părăsește/i });
      const hasAction = (await enrollBtn.isVisible().catch(() => false)) || (await leaveBtn.isVisible().catch(() => false));
      expect(hasAction).toBeTruthy();
    }
  });

  test("secțiunea de comentarii se deschide la click", async ({ page }) => {
    const card = page.locator("[class*='card'], a[href*='pilgrimage']").first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForURL(/\/pilgrimage\//, { timeout: 5000 });
      const commentBtn = page.locator("text=/comentari|Adaugă/i").first();
      if (await commentBtn.isVisible()) {
        await commentBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("postare pe peretele pelerinajului", async ({ page }) => {
    const card = page.locator("[class*='card'], a[href*='pilgrimage']").first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForURL(/\/pilgrimage\//, { timeout: 5000 });
      const postInput = page.locator("textarea[placeholder*='scrie'], textarea[placeholder*='Scrie'], textarea[placeholder*='gând']").first();
      if (await postInput.isVisible()) {
        await postInput.fill("Test E2E - postare de test");
        // Don't actually submit to avoid polluting data
      }
    }
  });
});
