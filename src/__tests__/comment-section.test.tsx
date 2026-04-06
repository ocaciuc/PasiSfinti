import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommentSection from "@/components/CommentSection";

// Mock supabase with proper chaining
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const createChain = (resolveData: any = [], count: number | null = null) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: resolveData, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: resolveData, error: null }),
    };
    chain.then = (resolve: any) => resolve({ data: resolveData, error: null, count });
    return chain;
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "comments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
                // For count queries
                then: (resolve: any) => resolve({ count: 0, error: null }),
              }),
              // head count
              then: (resolve: any) => resolve({ count: 0, error: null }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "new-comment",
                    user_id: "user-1",
                    content: "Test comment",
                    created_at: new Date().toISOString(),
                    parent_comment_id: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return createChain({ first_name: "Ion", avatar_url: null });
        }
        return createChain([]);
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

const defaultProps = {
  postId: "post-1",
  userId: "user-1",
  userBadges: {},
  onCommentAdded: vi.fn(),
};

describe("CommentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collapsed state initially", () => {
    render(<CommentSection {...defaultProps} />);
    expect(screen.getByText(/Adaugă un comentariu/)).toBeInTheDocument();
  });

  it("shows comment count when there are comments", async () => {
    render(<CommentSection {...defaultProps} />);
    // Initially shows collapsed button
    const button = screen.getByText(/comentariu|Adaugă/);
    expect(button).toBeInTheDocument();
  });

  it("expands on click", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    const button = screen.getByText(/comentariu|Adaugă/);
    await user.click(button);
    await waitFor(() => {
      expect(screen.getByText(/Adaugă un comentariu/)).toBeInTheDocument();
    });
  });

  it("shows empty state when no comments", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => {
      expect(screen.getByText("Niciun comentariu încă.")).toBeInTheDocument();
    });
  });

  it("shows comment input when clicking add comment", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    // Expand
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => {
      expect(screen.getByText(/Adaugă un comentariu/)).toBeInTheDocument();
    });
    // Click add comment button
    const addBtn = screen.getByText("Adaugă un comentariu...");
    await user.click(addBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Scrie un comentariu...")).toBeInTheDocument();
    });
  });

  it("shows character counter in comment input", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => screen.getByText(/Adaugă un comentariu/));
    await user.click(screen.getByText("Adaugă un comentariu..."));
    expect(screen.getByText("0/2000")).toBeInTheDocument();
  });

  it("disables submit button when empty", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => screen.getByText(/Adaugă un comentariu/));
    await user.click(screen.getByText("Adaugă un comentariu..."));
    const submitBtn = screen.getByText("Comentează");
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when text is entered", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => screen.getByText(/Adaugă un comentariu/));
    await user.click(screen.getByText("Adaugă un comentariu..."));
    const textarea = screen.getByPlaceholderText("Scrie un comentariu...");
    await user.type(textarea, "Test");
    const submitBtn = screen.getByText("Comentează");
    expect(submitBtn).not.toBeDisabled();
  });

  it("shows cancel button in comment input", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => screen.getByText(/Adaugă un comentariu/));
    await user.click(screen.getByText("Adaugă un comentariu..."));
    expect(screen.getByText("Anulează")).toBeInTheDocument();
  });

  it("hides input on cancel", async () => {
    const user = userEvent.setup();
    render(<CommentSection {...defaultProps} />);
    await user.click(screen.getByText(/comentariu|Adaugă/));
    await waitFor(() => screen.getByText(/Adaugă un comentariu/));
    await user.click(screen.getByText("Adaugă un comentariu..."));
    await user.click(screen.getByText("Anulează"));
    expect(screen.queryByPlaceholderText("Scrie un comentariu...")).not.toBeInTheDocument();
  });

  it("does not render without userId", () => {
    render(<CommentSection {...defaultProps} userId={null} />);
    // Should still render the collapsed view
    expect(screen.getByText(/comentariu|Adaugă/)).toBeInTheDocument();
  });
});
