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
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1", email: "test@test.com" } } } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({}),
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

import UserDataDeletion from "@/pages/UserDataDeletion";

describe("UserDataDeletion Page", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("renders the page", () => {
    render(<MemoryRouter><UserDataDeletion /></MemoryRouter>);
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
