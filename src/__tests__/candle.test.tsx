import { describe, it, expect, vi, beforeEach } from "vitest";
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
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));
vi.mock("@/components/AnimatedCandle", () => ({ default: (props: any) => <div data-testid="animated-candle" /> }));
vi.mock("@/components/CandleHistory", () => ({ CandleHistory: () => <div data-testid="candle-history" /> }));
vi.mock("@/lib/play-billing", () => ({
  isNativeAndroid: vi.fn(() => false),
  connectBilling: vi.fn(),
  getCandleProductDetails: vi.fn(),
  purchaseCandle: vi.fn(),
  acknowledgePurchase: vi.fn(),
  consumePurchase: vi.fn(),
  getOwnedPurchases: vi.fn(),
  releaseOwnedCandlePurchases: vi.fn(),
}));

import Candle from "@/pages/Candle";

describe("Candle Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders the page header", () => {
    render(<MemoryRouter><Candle /></MemoryRouter>);
    expect(screen.getByText("Aprinde o Lumânare")).toBeInTheDocument();
  });

  it("redirects to /auth when no session", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as any);

    render(<MemoryRouter><Candle /></MemoryRouter>);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });
});
