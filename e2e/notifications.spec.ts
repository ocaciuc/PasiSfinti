import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Notificări & Setări Notificări", () => {
  // ──────────────────────────────────────────────
  // Setări notificări pe pagina de Profil
  // ──────────────────────────────────────────────
  test.describe("Setări notificări (Profil)", () => {
    test.beforeEach(async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) test.skip();
      await navigateTo(page, "Profil");
      await page.waitForURL(/\/profile/, { timeout: 5000 });
    });

    test("afișează cardul de setări notificări", async ({ page }) => {
      await expect(page.locator("text=/Notificări/i").first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=/Alege ce tipuri de notificări/i").first()).toBeVisible();
    });

    test("afișează cele 3 categorii de notificări", async ({ page }) => {
      await expect(page.locator("text=Mesaje Pelerinaj")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=Activitate Lumânări")).toBeVisible();
      await expect(page.locator("text=Calendar Pelerinaje")).toBeVisible();
    });

    test("afișează descrieri pentru fiecare categorie", async ({ page }) => {
      await expect(page.locator("text=/cineva răspunde la comentariul/i").first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=/lumânare aprinsă.*urmează să se stingă/i").first()).toBeVisible();
      await expect(page.locator("text=/3 zile înainte/i").first()).toBeVisible();
    });

    test("toggle-urile sunt vizibile și interactive", async ({ page }) => {
      // Wait for loading to finish
      await expect(page.locator("text=Mesaje Pelerinaj")).toBeVisible({ timeout: 5000 });

      // Find switches
      const switches = page.locator("button[role='switch']");
      const count = await switches.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test("toggle Mesaje Pelerinaj se poate dezactiva și reactiva", async ({ page }) => {
      await expect(page.locator("text=Mesaje Pelerinaj")).toBeVisible({ timeout: 5000 });

      const toggle = page.locator("#comment_replies");
      await expect(toggle).toBeVisible();

      const initialState = await toggle.getAttribute("data-state");

      // Toggle off
      await toggle.click();
      await page.waitForTimeout(500);
      const newState = await toggle.getAttribute("data-state");
      expect(newState).not.toBe(initialState);

      // Toggle back
      await toggle.click();
      await page.waitForTimeout(500);
      const restoredState = await toggle.getAttribute("data-state");
      expect(restoredState).toBe(initialState);
    });

    test("toggle Activitate Lumânări se poate comuta", async ({ page }) => {
      await expect(page.locator("text=Activitate Lumânări")).toBeVisible({ timeout: 5000 });

      const toggle = page.locator("#candle_activity");
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForTimeout(500);
      // Should not show error
    });

    test("toggle Calendar Pelerinaje se poate comuta", async ({ page }) => {
      await expect(page.locator("text=Calendar Pelerinaje")).toBeVisible({ timeout: 5000 });

      const toggle = page.locator("#pilgrimage_reminders");
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForTimeout(500);
    });
  });

  // ──────────────────────────────────────────────
  // Integrare deep link notificări
  // ──────────────────────────────────────────────
  test.describe("Deep link routing", () => {
    test("ruta /candle este accesibilă (deep link lumânare)", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/candle");
      await page.waitForURL(/\/candle/, { timeout: 5000 });
      await expect(page.locator("text=/Lumânare|Aprinde/i").first()).toBeVisible();
    });

    test("ruta /pilgrimage/:id este accesibilă (deep link pelerinaj)", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      // Navigate to pilgrimages to find a real ID
      await page.goto("/pilgrimages");
      await page.waitForURL(/\/pilgrimages/, { timeout: 5000 });

      const card = page.locator("a[href*='/pilgrimage/']").first();
      if (await card.isVisible().catch(() => false)) {
        const href = await card.getAttribute("href");
        if (href) {
          await page.goto(href);
          await page.waitForURL(/\/pilgrimage\//, { timeout: 5000 });
          expect(page.url()).toMatch(/\/pilgrimage\//);
        }
      }
    });

    test("ruta /dashboard este accesibilă (deep link fallback)", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/dashboard");
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      expect(page.url()).toContain("/dashboard");
    });
  });

  // ──────────────────────────────────────────────
  // Persistența preferințelor
  // ──────────────────────────────────────────────
  test.describe("Persistență preferințe", () => {
    test("preferințele se păstrează după reîncărcarea paginii", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await navigateTo(page, "Profil");
      await page.waitForURL(/\/profile/, { timeout: 5000 });
      await expect(page.locator("text=Mesaje Pelerinaj")).toBeVisible({ timeout: 5000 });

      // Read initial state
      const toggle = page.locator("#comment_replies");
      const stateBefore = await toggle.getAttribute("data-state");

      // Toggle
      await toggle.click();
      await page.waitForTimeout(1000);
      const stateAfter = await toggle.getAttribute("data-state");
      expect(stateAfter).not.toBe(stateBefore);

      // Reload page
      await page.reload();
      await expect(page.locator("text=Mesaje Pelerinaj")).toBeVisible({ timeout: 5000 });

      // Check persisted state
      const stateReloaded = await page.locator("#comment_replies").getAttribute("data-state");
      expect(stateReloaded).toBe(stateAfter);

      // Restore original state
      await page.locator("#comment_replies").click();
      await page.waitForTimeout(500);
    });
  });
});
