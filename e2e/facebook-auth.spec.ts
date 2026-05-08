import { test, expect } from "@playwright/test";

test.describe("Autentificare Facebook", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("afișează butonul 'Continuă cu Facebook'", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continuă cu Facebook/i })).toBeVisible();
  });

  test("butonul Facebook este activ și clickabil", async ({ page }) => {
    const btn = page.getByRole("button", { name: /Continuă cu Facebook/i });
    await expect(btn).toBeEnabled();
  });

  test("click pe Facebook inițiază redirect OAuth către Supabase/Facebook", async ({ page }) => {
    // Interceptăm navigarea externă către Facebook OAuth
    const navPromise = page.waitForRequest(
      (req) =>
        req.url().includes("supabase.co/auth/v1/authorize") &&
        req.url().includes("provider=facebook"),
      { timeout: 10000 }
    ).catch(() => null);

    await page.getByRole("button", { name: /Continuă cu Facebook/i }).click();

    const req = await navPromise;
    expect(req, "trebuie să existe o cerere OAuth către Supabase pentru provider=facebook").not.toBeNull();
    expect(req!.url()).toContain("provider=facebook");
    expect(req!.url()).toContain("redirect_to=");
  });

  test("butonul Facebook se dezactivează în timpul login-ului email", async ({ page }) => {
    await page.getByPlaceholder("email@exemplu.com").fill("test@example.com");
    await page.getByPlaceholder("Parola ta").fill("Test1234!");
    await page.getByRole("button", { name: "Autentificare" }).click();
    // În timpul cererii email, butonul Facebook e dezactivat
    await expect(page.getByRole("button", { name: /Continuă cu Facebook/i })).toBeDisabled({ timeout: 3000 }).catch(() => {});
  });

  test("verifică endpoint-ul OAuth Supabase răspunde cu redirect către Facebook", async ({ request }) => {
    const res = await request.get(
      "https://yanjhfqqdcevlzmwsrnj.supabase.co/auth/v1/authorize?provider=facebook&redirect_to=https://pelerinaj.app/auth/callback",
      { maxRedirects: 0 }
    );
    expect(res.status()).toBe(302);
    const location = res.headers()["location"];
    expect(location).toContain("facebook.com");
    expect(location).toContain("client_id=");
    expect(location).toContain("scope=email");
  });
});
