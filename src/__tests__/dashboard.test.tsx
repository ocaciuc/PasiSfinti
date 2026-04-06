import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUser = { id: "user-1", email: "test@test.com" };
const mockSession = { user: mockUser };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1", email: "test@test.com" } } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "profile-1" }, error: null }),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          is: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));
vi.mock("@/components/TodayCalendarCard", () => ({ TodayCalendarCard: () => <div data-testid="calendar-card" /> }));
vi.mock("@/components/AnimatedCandle", () => ({ default: () => <div data-testid="animated-candle" /> }));

import Dashboard from "@/pages/Dashboard";

describe("Dashboard Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("redirects to /auth when no session", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as any);

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><Dashboard /></MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });
});
