import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockProfile = {
  first_name: "Ion",
  last_name: "Popescu",
  age: 35,
  religion: "Ortodox",
  city: "București",
  parish: "Sf. Gheorghe",
  avatar_url: null,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })),
      })),
    })),
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));
vi.mock("@/components/BadgesSection", () => ({ default: () => <div data-testid="badges" /> }));
vi.mock("@/components/NotificationSettingsCard", () => ({ default: () => <div data-testid="notif-settings" /> }));
vi.mock("@/lib/capacitor-storage", () => ({ clearAuthStorage: vi.fn() }));
vi.mock("@/lib/native-google-signin", () => ({ signOutFromGoogle: vi.fn() }));
vi.mock("@/lib/avatar-upload", () => ({ uploadAvatar: vi.fn() }));

import Profile from "@/pages/Profile";

describe("Profile Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders loading skeleton initially", () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(screen.getByText("Profilul Meu")).toBeInTheDocument();
  });

  it("redirects to /auth when no user", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null }, error: { message: "No user" } } as any);

    render(<MemoryRouter><Profile /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });
});
