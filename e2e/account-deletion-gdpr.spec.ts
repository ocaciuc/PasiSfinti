import { test, expect } from "@playwright/test";
import { ensureDashboard, navigateTo } from "./helpers";

test.describe("Ștergere Cont & GDPR Compliance", () => {
  // ──────────────────────────────────────────────
  // GDPR: Pagini publice accesibile fără autentificare
  // ──────────────────────────────────────────────
  test.describe("Pagini GDPR publice", () => {
    test("pagina Privacy Policy este accesibilă public", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.locator("text=/Confidențialitate|Privacy|Politica/i").first()).toBeVisible({ timeout: 5000 });
      // Should NOT redirect to auth
      expect(page.url()).toContain("/privacy");
    });

    test("pagina Terms & Conditions este accesibilă public", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.locator("text=/Termeni|Condiții|Terms/i").first()).toBeVisible({ timeout: 5000 });
      expect(page.url()).toContain("/terms");
    });

    test("pagina Child Safety este accesibilă public", async ({ page }) => {
      await page.goto("/child-safety");
      await expect(page.locator("text=/Siguranță|Safety|Copii/i").first()).toBeVisible({ timeout: 5000 });
      expect(page.url()).toContain("/child-safety");
    });

    test("pagina Account Deleted este accesibilă public", async ({ page }) => {
      await page.goto("/account-deleted");
      await expect(page.locator("text=/Cont șters|Account Deleted|șterse/i").first()).toBeVisible({ timeout: 5000 });
      expect(page.url()).toContain("/account-deleted");
    });
  });

  // ──────────────────────────────────────────────
  // GDPR: Informarea utilizatorului despre datele colectate
  // ──────────────────────────────────────────────
  test.describe("Transparență date colectate", () => {
    test("pagina User Data Deletion redirecționează la auth dacă neautentificat", async ({ page }) => {
      await page.goto("/user-data-deletion");
      await page.waitForTimeout(3000);
      expect(page.url()).toContain("/auth");
    });

    test("pagina User Data Deletion afișează lista datelor șterse (autentificat)", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      // Check GDPR-required data transparency
      await expect(page.locator("text=/Ce date vor fi șterse/i").first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=/profilul/i").first()).toBeVisible();
      await expect(page.locator("text=/Pelerinajele/i").first()).toBeVisible();
      await expect(page.locator("text=/Postările/i").first()).toBeVisible();
      await expect(page.locator("text=/lumânărilor/i").first()).toBeVisible();
    });

    test("afișează email-ul utilizatorului autentificat", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      // Should display authenticated user's email
      await expect(page.locator("text=/autentificat cu/i").first()).toBeVisible({ timeout: 5000 });
    });

    test("afișează avertisment de ireversibilitate", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      await expect(page.locator("text=/permanentă|ireversibilă/i").first()).toBeVisible({ timeout: 5000 });
    });

    test("afișează email de contact pentru întrebări GDPR", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      await expect(page.locator("text=pelerinulapp@gmail.com")).toBeVisible();
    });
  });

  // ──────────────────────────────────────────────
  // Flow: Ștergere cont din Settings
  // ──────────────────────────────────────────────
  test.describe("Ștergere cont din Setări", () => {
    test("secțiunea Zonă Periculoasă este vizibilă în Settings", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await expect(page.locator("text=/Zonă Periculoasă/i").first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=/Șterge contul/i").first()).toBeVisible();
    });

    test("listează datele ce vor fi șterse în Settings", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await expect(page.locator("text=/Profilul/i").first()).toBeVisible();
      await expect(page.locator("text=/Postările/i").first()).toBeVisible();
    });

    test("butonul Șterge contul deschide dialog de confirmare", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await page.getByRole("button", { name: /Șterge contul/i }).click();
      await expect(page.locator("[role='alertdialog']")).toBeVisible({ timeout: 3000 });
      await expect(page.locator("text=/Ești sigur/i").first()).toBeVisible();
    });

    test("dialogul de confirmare are buton de anulare", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await page.getByRole("button", { name: /Șterge contul/i }).click();
      await expect(page.locator("[role='alertdialog']")).toBeVisible({ timeout: 3000 });

      // Cancel should close dialog
      await page.getByRole("button", { name: /Anulează/i }).click();
      await expect(page.locator("[role='alertdialog']")).not.toBeVisible({ timeout: 3000 });
    });

    test("dialogul conține confirmare explicită „Da, șterge contul"", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await page.getByRole("button", { name: /Șterge contul/i }).click();
      await expect(page.getByRole("button", { name: /Da, șterge contul/i })).toBeVisible({ timeout: 3000 });
    });
  });

  // ──────────────────────────────────────────────
  // Flow: Ștergere cont din User Data Deletion page
  // ──────────────────────────────────────────────
  test.describe("Ștergere cont din pagina dedicată", () => {
    test("butonul Șterge datele mele deschide dialog de confirmare", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      await page.getByRole("button", { name: /Șterge datele mele/i }).click();
      await expect(page.locator("[role='alertdialog']")).toBeVisible({ timeout: 3000 });
      await expect(page.locator("text=/Ești sigur/i").first()).toBeVisible();
    });

    test("butonul Anulează revine la profil", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      await page.getByRole("button", { name: /Anulează și revino/i }).click();
      await page.waitForURL(/\/profile/, { timeout: 5000 });
      expect(page.url()).toContain("/profile");
    });

    test("anularea dialogului de confirmare nu șterge contul", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/user-data-deletion");
      await page.waitForURL(/\/user-data-deletion/, { timeout: 5000 });

      await page.getByRole("button", { name: /Șterge datele mele/i }).click();
      await expect(page.locator("[role='alertdialog']")).toBeVisible({ timeout: 3000 });
      await page.getByRole("button", { name: /Anulează/i }).click();

      // Still on the same page, not redirected
      expect(page.url()).toContain("/user-data-deletion");
    });
  });

  // ──────────────────────────────────────────────
  // GDPR: Logout / Deconectare
  // ──────────────────────────────────────────────
  test.describe("Deconectare", () => {
    test("butonul Deconectează-te funcționează din Settings", async ({ page }) => {
      const ok = await ensureDashboard(page);
      if (!ok) return;

      await page.goto("/settings");
      await page.waitForURL(/\/settings/, { timeout: 5000 });

      await page.getByRole("button", { name: /Deconectează-te/i }).click();
      await page.waitForURL(/\/auth/, { timeout: 10000 });
      expect(page.url()).toContain("/auth");
    });
  });
});
