import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Onboarding from "@/pages/Onboarding";
import { supabase } from "@/integrations/supabase/client";

// Get navigate mock
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderOnboarding() {
  return render(
    <BrowserRouter>
      <Onboarding />
    </BrowserRouter>
  );
}

// Helper to mock supabase.auth.getUser
function mockGetUser(user: { id: string } | null, error: unknown = null) {
  (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { user },
    error,
  });
}

// Helper to mock supabase.from().select().eq().maybeSingle() chain
function mockProfileCheck(profile: { id: string } | null, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
    select,
    upsert: vi.fn().mockResolvedValue({ error: null }),
  });
}

describe("Onboarding Flow - UI Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser({ id: "user-123" });
    mockProfileCheck(null); // No existing profile
  });

  it("renders step 1 with personal info fields", () => {
    renderOnboarding();
    expect(screen.getByText("Pasul 1 din 4 • Creează-ți profilul de pelerin")).toBeInTheDocument();
    expect(screen.getByLabelText("Prenume")).toBeInTheDocument();
    expect(screen.getByLabelText("Nume")).toBeInTheDocument();
    expect(screen.getByLabelText("Vârsta")).toBeInTheDocument();
  });

  it("disables Continue button when step 1 fields are empty", () => {
    renderOnboarding();
    const btn = screen.getByRole("button", { name: /continuă/i });
    expect(btn).toBeDisabled();
  });

  it("enables Continue button when step 1 is filled correctly", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");

    const btn = screen.getByRole("button", { name: /continuă/i });
    expect(btn).toBeEnabled();
  });

  it("shows age validation error for invalid age", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await user.type(screen.getByLabelText("Vârsta"), "0");

    expect(screen.getByText("Vârsta trebuie să fie între 1 și 120 de ani")).toBeInTheDocument();
  });

  it("navigates from step 1 to step 2", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    expect(screen.getByLabelText("Religie")).toBeInTheDocument();
    expect(screen.getByLabelText("Oraș")).toBeInTheDocument();
    expect(screen.getByLabelText("Parohie")).toBeInTheDocument();
  });

  it("navigates back from step 2 to step 1", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Go to step 2
    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    // Go back
    await user.click(screen.getByRole("button", { name: /înapoi/i }));

    expect(screen.getByLabelText("Prenume")).toBeInTheDocument();
  });

  it("shows step 3 with photo upload", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Fill step 1
    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    // Fill step 2
    await user.clear(screen.getByLabelText("Religie"));
    await user.type(screen.getByLabelText("Religie"), "Ortodox");
    await user.type(screen.getByLabelText("Oraș"), "București");
    await user.type(screen.getByLabelText("Parohie"), "Sf. Gheorghe");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    // Step 3
    expect(screen.getByText(/fotografie de profil/i)).toBeInTheDocument();
  });

  it("shows step 4 with bio textarea", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    // Fill steps 1-3
    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    await user.clear(screen.getByLabelText("Religie"));
    await user.type(screen.getByLabelText("Religie"), "Ortodox");
    await user.type(screen.getByLabelText("Oraș"), "București");
    await user.type(screen.getByLabelText("Parohie"), "Sf. Gheorghe");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    await user.click(screen.getByRole("button", { name: /continuă/i })); // Skip photo

    // Step 4
    expect(screen.getByText(/despre tine/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finalizează/i })).toBeInTheDocument();
  });

  it("redirects to dashboard if profile already exists on mount", async () => {
    mockProfileCheck({ id: "profile-123" });
    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to /auth if no authenticated user on mount", async () => {
    mockGetUser(null, { message: "not authenticated" });
    (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({});
    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("step 2 religion field has Ortodox as default value", async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await user.type(screen.getByLabelText("Prenume"), "Ion");
    await user.type(screen.getByLabelText("Nume"), "Popescu");
    await user.type(screen.getByLabelText("Vârsta"), "30");
    await user.click(screen.getByRole("button", { name: /continuă/i }));

    expect(screen.getByLabelText("Religie")).toHaveValue("Ortodox");
  });

  it("has 4 step indicator dots", () => {
    renderOnboarding();
    const dots = document.querySelectorAll(".rounded-full.h-2.w-2");
    expect(dots.length).toBe(4);
  });
});
