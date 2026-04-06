import { Page } from "@playwright/test";

/**
 * Login helper - uses Supabase email/password auth.
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD env vars.
 */
export async function login(page: Page) {
  const email = process.env.E2E_USER_EMAIL || "test@example.com";
  const password = process.env.E2E_USER_PASSWORD || "Test1234!";

  await page.goto("/auth");
  await page.getByPlaceholder("email@exemplu.com").fill(email);
  await page.getByPlaceholder("Parola ta").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

/**
 * Ensure user is on dashboard (logged in with completed profile).
 */
export async function ensureDashboard(page: Page) {
  await login(page);
  if (page.url().includes("/onboarding")) {
    // Skip - user needs onboarding, tests should handle this
    return false;
  }
  await page.waitForSelector("nav", { timeout: 5000 });
  return true;
}

/**
 * Navigate via bottom navigation bar.
 */
export async function navigateTo(page: Page, label: string) {
  await page.locator("nav").getByText(label).click();
}
