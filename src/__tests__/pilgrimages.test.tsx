import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));

import Pilgrimages from "@/pages/Pilgrimages";

describe("Pilgrimages Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders the page header", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><Pilgrimages /></MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Pelerinaje")).toBeInTheDocument();
  });
});
