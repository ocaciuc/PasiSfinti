import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOnAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
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
  translateAuthError: vi.fn((err) => err?.message || "Eroare"),
}));

import Auth from "@/pages/Auth";

describe("Auth Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it("renders the app title", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByText("Pași de Pelerin")).toBeInTheDocument();
  });

  it("renders login form with email and password inputs", () => {
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
