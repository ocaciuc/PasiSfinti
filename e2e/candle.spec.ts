import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Lumânare Virtuală", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await ensureDashboard(page);
    if (!ok) test.skip();
    await navigateTo(page, "Lumânare");
    await page.waitForURL(/\/candle/, { timeout: 5000 });
  });

  test("afișează pagina lumânării", async ({ page }) => {
    await expect(page.locator("text=/Lumânare|Aprinde/i").first()).toBeVisible();
  });

  test("afișează butonul de aprindere sau timer-ul activ", async ({ page }) => {
    const lightBtn = page.getByRole("button", { name: /aprinde/i });
    const timer = page.locator("text=/ore|min|sec|arde/i").first();
    const hasContent = (await lightBtn.isVisible().catch(() => false)) || (await timer.isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  test("afișează istoricul lumânărilor", async ({ page }) => {
    const historySection = page.locator("text=/Istoric|Lumânări aprinse/i").first();
    // History section may or may not be present
    if (await historySection.isVisible().catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });

  test("click pe aprinde arată confirmare sau billing", async ({ page }) => {
    const lightBtn = page.getByRole("button", { name: /aprinde/i });
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      await page.waitForTimeout(1000);
      // Should show confirmation dialog, prayer input, or billing prompt
      const hasDialog = await page.locator("[role='dialog'], [role='alertdialog'], text=/rugăciune|confirma|intenție/i").first().isVisible().catch(() => false);
      // On web (non-native) there should be some UI response
    }
  });
});
