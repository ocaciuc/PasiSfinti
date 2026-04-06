import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import ConfirmareCont from "@/pages/ConfirmareCont";

describe("ConfirmareCont Page", () => {
  it("renders confirmation icon and message", () => {
    render(<MemoryRouter><ConfirmareCont /></MemoryRouter>);
    expect(screen.getByText(/confirmat/i)).toBeInTheDocument();
  });

  it("renders button to go to auth", () => {
    render(<MemoryRouter><ConfirmareCont /></MemoryRouter>);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
