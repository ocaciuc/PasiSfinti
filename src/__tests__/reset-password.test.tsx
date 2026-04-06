import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock("@/lib/onboarding-error-handler", () => ({
  translateAuthError: vi.fn((err) => err?.message || "Eroare"),
}));

import ResetPassword from "@/pages/ResetPassword";

describe("ResetPassword Page", () => {
  it("renders the page title", () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(screen.getByText("Resetare parolă")).toBeInTheDocument();
  });

  it("renders password input fields", () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(screen.getByText("Parolă nouă")).toBeInTheDocument();
    expect(screen.getByText("Confirmă parola")).toBeInTheDocument();
  });
});
