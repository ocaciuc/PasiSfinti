import { describe, it, expect } from "vitest";
import {
  handleOnboardingError,
  isDuplicateProfileError,
  translateSupabaseError,
} from "@/lib/onboarding-error-handler";

describe("isDuplicateProfileError", () => {
  it("detects PostgreSQL duplicate key error code 23505", () => {
    expect(isDuplicateProfileError({ code: "23505", message: "", details: "", hint: "" })).toBe(true);
  });

  it("detects profiles_user_id_key constraint message", () => {
    expect(isDuplicateProfileError({
      code: "23505",
      message: "duplicate key value violates unique constraint \"profiles_user_id_key\"",
      details: "", hint: "",
    })).toBe(true);
  });

  it("returns false for non-duplicate errors", () => {
    expect(isDuplicateProfileError({ code: "42501", message: "permission denied", details: "", hint: "" })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isDuplicateProfileError(null)).toBe(false);
    expect(isDuplicateProfileError(undefined)).toBe(false);
  });
});

describe("handleOnboardingError", () => {
  it("returns redirect to / for duplicate profile error", () => {
    const result = handleOnboardingError({ code: "23505", message: "duplicate key", details: "", hint: "" });
    expect(result.recovery).toEqual({ type: "redirect", to: "/" });
    expect(result.shouldBlock).toBe(false);
  });

  it("returns redirect to /auth for RLS policy violation", () => {
    const result = handleOnboardingError({ code: "42501", message: "row-level security", details: "", hint: "" });
    expect(result.recovery).toEqual({ type: "redirect", to: "/auth" });
  });

  it("returns retry for network errors", () => {
    const result = handleOnboardingError(new Error("Failed to fetch"));
    expect(result.recovery).toEqual({ type: "retry" });
  });

  it("returns redirect to /auth for JWT errors", () => {
    const result = handleOnboardingError(new Error("JWT expired"));
    expect(result.recovery).toEqual({ type: "redirect", to: "/auth" });
  });

  it("returns redirect to /auth for foreign key constraint", () => {
    const result = handleOnboardingError({ code: "23503", message: "foreign key constraint", details: "", hint: "" });
    expect(result.recovery).toEqual({ type: "redirect", to: "/auth" });
  });

  it("returns redirect to /auth as default fallback", () => {
    const result = handleOnboardingError(new Error("unknown error"));
    expect(result.recovery).toEqual({ type: "redirect", to: "/auth" });
    expect(result.shouldBlock).toBe(false);
  });
});

describe("translateSupabaseError", () => {
  it("translates duplicate key error", () => {
    const msg = translateSupabaseError({ code: "23505", message: "duplicate key value violates unique constraint", details: "", hint: "" });
    expect(msg).toBe("Această înregistrare există deja.");
  });

  it("translates network error", () => {
    expect(translateSupabaseError(new Error("Failed to fetch"))).toBe("Eroare de conexiune. Verifică conexiunea la internet.");
  });

  it("translates auth error by code", () => {
    expect(translateSupabaseError({ code: "weak_password", message: "", name: "AuthApiError", status: 422 }))
      .toContain("Parola este prea slabă");
  });

  it("returns fallback for unknown errors", () => {
    expect(translateSupabaseError(new Error("xyzzy"))).toBe("A apărut o eroare neprevăzută. Te rugăm să încerci din nou.");
  });

  it("handles null/undefined gracefully", () => {
    expect(translateSupabaseError(null)).toBe("A apărut o eroare neprevăzută. Te rugăm să încerci din nou.");
    expect(translateSupabaseError(undefined)).toBe("A apărut o eroare neprevăzută. Te rugăm să încerci din nou.");
  });
});
