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
    },
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));
vi.mock("@/components/TodayCalendarCard", () => ({ TodayCalendarCard: (props: any) => <div data-testid="calendar-card" /> }));

import Calendar from "@/pages/Calendar";

describe("Calendar Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders the page header", () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(screen.getByText("Calendar Ortodox")).toBeInTheDocument();
  });

  it("renders navigation", () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(screen.getByTestId("navigation")).toBeInTheDocument();
  });

  it("renders calendar card", () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(screen.getByTestId("calendar-card")).toBeInTheDocument();
  });

  it("redirects to /auth when no session", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as any);
    
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });
});
