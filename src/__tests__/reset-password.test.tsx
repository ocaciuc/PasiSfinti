import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  translateAuthError: vi.fn((err: any) => err?.message || "Eroare"),
}));

vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));

import ResetPassword from "@/pages/ResetPassword";

describe("ResetPassword Page", () => {
  it("renders the page", async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Pași de Pelerin")).toBeInTheDocument();
    });
  });
});
