import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { title: "Test", location: "Loc", start_date: "2026-01-01" }, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      storage: { from: vi.fn() },
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn() })) },
  },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav data-testid="navigation" /> }));

import SpiritualDiary from "@/pages/SpiritualDiary";

describe("SpiritualDiary Page", () => {
  it("renders the page", () => {
    render(
      <MemoryRouter initialEntries={["/pilgrimage/123/diary"]}>
        <Routes>
          <Route path="/pilgrimage/:id/diary" element={<SpiritualDiary />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
