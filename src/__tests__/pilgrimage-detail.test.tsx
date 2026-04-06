import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          is: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));
vi.mock("@/components/CommentSection", () => ({ default: () => <div data-testid="comments" /> }));
vi.mock("@/components/UserBadge", () => ({ default: () => <span data-testid="badge" /> }));
vi.mock("@/hooks/usePilgrimageData", () => ({
  usePilgrimageDetails: vi.fn(() => ({ data: null, isLoading: true, error: null })),
  usePilgrimageCommunity: vi.fn(() => ({ data: null, isLoading: true, error: null })),
  useInvalidatePilgrimageData: vi.fn(() => vi.fn()),
}));

import PilgrimageDetail from "@/pages/PilgrimageDetail";

describe("PilgrimageDetail Page", () => {
  it("renders loading state", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/pilgrimage/123"]}>
          <Routes>
            <Route path="/pilgrimage/:id" element={<PilgrimageDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    // Should be in loading state
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
