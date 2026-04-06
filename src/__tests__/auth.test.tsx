import { describe, it, expect, vi, beforeEach } from "vitest";
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
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock("@/lib/native-google-signin", () => ({
  performNativeGoogleSignIn: vi.fn(),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock("@/lib/capacitor-auth", () => ({
  performGoogleOAuth: vi.fn(),
}));

vi.mock("@/lib/onboarding-error-handler", () => ({
  translateAuthError: vi.fn((err: any) => err?.message || "Eroare"),
}));

vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));

import Auth from "@/pages/Auth";

describe("Auth Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the app title", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByText("Pași de Pelerin")).toBeInTheDocument();
  });

  it("renders login form", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByText("Intră în comunitate")).toBeInTheDocument();
  });

  it("renders Google login button", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByText("Continuă cu Google")).toBeInTheDocument();
  });

  it("renders sign-in and sign-up tabs", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByText("Autentificare")).toBeInTheDocument();
    expect(screen.getByText("Înregistrare")).toBeInTheDocument();
  });
});
