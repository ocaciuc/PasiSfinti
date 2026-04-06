import { test, expect } from "@playwright/test";

test.describe("Autentificare", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("afișează pagina de login", async ({ page }) => {
    await expect(page.getByPlaceholder("email@exemplu.com")).toBeVisible();
    await expect(page.getByPlaceholder("Parola ta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Autentificare" })).toBeVisible();
  });

  test("afișează eroare la credențiale invalide", async ({ page }) => {
    await page.getByPlaceholder("email@exemplu.com").fill("invalid@test.com");
    await page.getByPlaceholder("Parola ta").fill("WrongPass1!");
    await page.getByRole("button", { name: "Autentificare" }).click();
    // Expect an error toast or message
    await expect(page.locator("text=/eroare|invalid|greșit/i").first()).toBeVisible({ timeout: 10000 });
  });

  test("comută între login și înregistrare", async ({ page }) => {
    await page.getByText("Înregistrare").click();
    await expect(page.getByPlaceholder("Confirmă parola")).toBeVisible();
  });

  test("signup validează puterea parolei", async ({ page }) => {
    await page.getByText("Înregistrare").click();
    await page.getByPlaceholder("email@exemplu.com").fill("new@test.com");
    await page.getByPlaceholder("Parola ta").fill("weak");
    // Password strength indicators should show
    await expect(page.locator("text=/Minim 8 caractere/i").first()).toBeVisible();
  });

  test("forgot password afișează formularul de resetare", async ({ page }) => {
    await page.getByText(/ai uitat parola/i).click();
    await expect(page.getByRole("button", { name: /trimite/i })).toBeVisible();
  });

  test("login cu succes redirecționează la dashboard", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL || "test@example.com";
    const password = process.env.E2E_USER_PASSWORD || "Test1234!";
    await page.getByPlaceholder("email@exemplu.com").fill(email);
    await page.getByPlaceholder("Parola ta").fill(password);
    await page.getByRole("button", { name: "Autentificare" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/(dashboard|onboarding)/);
  });
});
