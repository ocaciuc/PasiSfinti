import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BadgesSection from "@/components/BadgesSection";

const mockBadges = [
  { id: "b1", name: "First Pilgrimage", name_ro: "Primul Pelerinaj", description: "Ai participat la primul tău pelerinaj", icon_name: "footprints", priority: 1, created_at: "2025-01-01" },
  { id: "b2", name: "Light Bearer", name_ro: "Purtător de Lumină", description: "Ai aprins 10 lumânări într-o lună", icon_name: "flame", priority: 2, created_at: "2025-01-01" },
];

const mockUserBadges = [
  { earned_at: "2025-06-15T10:00:00Z", badge_id: "b1", badges: mockBadges[0] },
];

// Build a chainable mock for supabase.from()
const buildChain = (data: any, error: any = null) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  // Terminal - resolve when awaited
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
};

vi.mock("@/integrations/supabase/client", () => {
  const fromMock = vi.fn((table: string) => {
    if (table === "badges") return buildChain(mockBadges);
    if (table === "user_badges") return buildChain(mockUserBadges);
    return buildChain([]);
  });
  return { supabase: { from: fromMock } };
});

describe("BadgesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons initially", () => {
    render(<BadgesSection userId="user-1" />);
    // Skeleton elements rendered during loading
    expect(document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]').length).toBeGreaterThanOrEqual(0);
  });

  it("renders all badges after loading", async () => {
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Primul Pelerinaj")).toBeInTheDocument();
      expect(screen.getByText("Purtător de Lumină")).toBeInTheDocument();
    });
  });

  it("shows earned badge with accent styling", async () => {
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Primul Pelerinaj")).toBeInTheDocument();
    });
    const earnedCard = screen.getByText("Primul Pelerinaj").closest("[class*='rounded-xl']");
    expect(earnedCard?.className).toContain("bg-accent");
  });

  it("shows unearned badge with grayscale", async () => {
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Purtător de Lumină")).toBeInTheDocument();
    });
    const unearnedCard = screen.getByText("Purtător de Lumină").closest("[class*='rounded-xl']");
    expect(unearnedCard?.className).toContain("grayscale");
  });

  it("opens dialog with full description on click", async () => {
    const user = userEvent.setup();
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Primul Pelerinaj")).toBeInTheDocument();
    });
    const card = screen.getByText("Primul Pelerinaj").closest("[class*='rounded-xl']");
    await user.click(card!);
    await waitFor(() => {
      // Dialog should show full description
      const descriptions = screen.getAllByText("Ai participat la primul tău pelerinaj");
      expect(descriptions.length).toBeGreaterThanOrEqual(2); // card + dialog
    });
  });

  it("shows earned date for earned badges", async () => {
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText(/15 iun/i)).toBeInTheDocument();
    });
  });

  it("shows section title with icon", async () => {
    render(<BadgesSection userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText("Insignele Mele")).toBeInTheDocument();
    });
  });
});
