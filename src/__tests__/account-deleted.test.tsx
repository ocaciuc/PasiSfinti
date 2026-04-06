import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

import AccountDeleted from "@/pages/AccountDeleted";

describe("AccountDeleted Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders confirmation title", () => {
    render(<MemoryRouter><AccountDeleted /></MemoryRouter>);
    expect(screen.getByText("Contul a fost șters")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<MemoryRouter><AccountDeleted /></MemoryRouter>);
    expect(screen.getByText(/Toate datele tale au fost șterse/)).toBeInTheDocument();
  });

  it("has a button to go back to auth", () => {
    render(<MemoryRouter><AccountDeleted /></MemoryRouter>);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
  });
});
