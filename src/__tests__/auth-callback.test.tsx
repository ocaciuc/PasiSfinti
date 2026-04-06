import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/lib/capacitor-auth", () => ({
  APP_SCHEME: "app.lovable",
  isNativePlatform: vi.fn(() => false),
}));

import AuthCallback from "@/pages/AuthCallback";

describe("AuthCallback Page", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <AuthCallback />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
