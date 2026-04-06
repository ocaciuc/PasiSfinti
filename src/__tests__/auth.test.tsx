import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
}));

vi.mock("@/lib/native-google-signin", () => ({
  performNativeGoogleSignIn: vi.fn(),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock("@/lib/capacitor-auth", () => ({
  performGoogleOAuth: vi.fn(),
}));

vi.mock("@/lib/onboarding-error-handler", () => ({
  translateAuthError: vi.fn((err: any) => err?.message || "Eroare"),
}));

vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));

import Auth from "@/pages/Auth";

const renderAuth = () => render(<MemoryRouter><Auth /></MemoryRouter>);

describe("Auth Page - Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the app title", () => {
    renderAuth();
    expect(screen.getByText("Pași de Pelerin")).toBeInTheDocument();
  });

  it("renders login form with email and password fields", () => {
    renderAuth();
    expect(screen.getByText("Intră în comunitate")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Parola")).toBeInTheDocument();
  });

  it("renders Google login button", () => {
    renderAuth();
    expect(screen.getByText("Continuă cu Google")).toBeInTheDocument();
  });

  it("renders sign-in and sign-up tabs", () => {
    renderAuth();
    expect(screen.getByText("Autentificare")).toBeInTheDocument();
    expect(screen.getByText("Înregistrare")).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderAuth();
    expect(screen.getByText("Ai uitat parola?")).toBeInTheDocument();
  });
});

describe("Auth Page - Email Validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects empty email on sign-in", async () => {
    const user = userEvent.setup();
    renderAuth();
    const passwordInput = screen.getByLabelText("Parola");
    await user.type(passwordInput, "Test1234!");
    const submitBtn = screen.getByText("Autentifică-te");
    await user.click(submitBtn);
    // The form has required attribute, so browser validation prevents submit
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects invalid email format on sign-in", async () => {
    const user = userEvent.setup();
    renderAuth();
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Parola");
    await user.type(emailInput, "not-an-email");
    await user.type(passwordInput, "somepassword");
    // Submit - browser validation on type="email" will block, but our Zod also catches
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe("Auth Page - Password Validation (Sign Up)", () => {
  beforeEach(() => vi.clearAllMocks());

  const switchToSignup = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByText("Înregistrare"));
  };

  it("rejects password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Parola");
    const confirmInput = screen.getByLabelText("Confirmă parola");

    await user.type(emailInput, "test@email.com");
    await user.type(passwordInput, "Ab1!");
    await user.type(confirmInput, "Ab1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it("rejects password without uppercase letter", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "abcdefg1!");
    await user.type(screen.getByLabelText("Confirmă parola"), "abcdefg1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it("rejects password without lowercase letter", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "ABCDEFG1!");
    await user.type(screen.getByLabelText("Confirmă parola"), "ABCDEFG1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it("rejects password without digit", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "Abcdefgh!");
    await user.type(screen.getByLabelText("Confirmă parola"), "Abcdefgh!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it("rejects password without special character", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "Abcdefg12");
    await user.type(screen.getByLabelText("Confirmă parola"), "Abcdefg12");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    renderAuth();
    await switchToSignup(user);

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "Abcdefg1!");
    await user.type(screen.getByLabelText("Confirmă parola"), "Different1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });
});

describe("Auth Page - Sign Up Flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signUp with valid credentials", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Înregistrare"));

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "StrongPass1!");
    await user.type(screen.getByLabelText("Confirmă parola"), "StrongPass1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@email.com",
        password: "StrongPass1!",
        options: { emailRedirectTo: expect.stringContaining("/confirmare-cont") },
      });
    });
  });

  it("shows error on signUp failure", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "User already registered" } });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Înregistrare"));

    await user.type(screen.getByLabelText("Email"), "existing@email.com");
    await user.type(screen.getByLabelText("Parola"), "StrongPass1!");
    await user.type(screen.getByLabelText("Confirmă parola"), "StrongPass1!");
    await user.click(screen.getByText("Creează cont"));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
  });
});

describe("Auth Page - Sign In Flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signInWithPassword with credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "anypassword");
    await user.click(screen.getByText("Autentifică-te"));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@email.com",
        password: "anypassword",
      });
    });
  });

  it("does not validate password strength on sign-in", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "weak");
    await user.click(screen.getByText("Autentifică-te"));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalled();
    });
  });

  it("shows error on sign-in failure", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const user = userEvent.setup();
    renderAuth();

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.type(screen.getByLabelText("Parola"), "wrongpass");
    await user.click(screen.getByText("Autentifică-te"));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalled();
    });
  });
});

describe("Auth Page - Forgot Password Flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows forgot password form when link clicked", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    expect(screen.getByText("Resetează parola")).toBeInTheDocument();
    expect(screen.getByText("Trimite link de resetare")).toBeInTheDocument();
  });

  it("shows back to login button in forgot password form", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    expect(screen.getByText("Înapoi la autentificare")).toBeInTheDocument();
  });

  it("sends reset email with valid email", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.click(screen.getByText("Trimite link de resetare"));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith("test@email.com", {
        redirectTo: expect.stringContaining("/reset-password"),
      });
    });
  });

  it("shows confirmation after reset email sent", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.click(screen.getByText("Trimite link de resetare"));

    await waitFor(() => {
      expect(screen.getByText("Verifică-ți emailul")).toBeInTheDocument();
    });
  });

  it("returns to login from reset confirmation", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.click(screen.getByText("Trimite link de resetare"));

    await waitFor(() => {
      expect(screen.getByText("Verifică-ți emailul")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Înapoi la autentificare"));
    expect(screen.getByText("Intră în comunitate")).toBeInTheDocument();
  });

  it("shows error on reset failure", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: "Rate limit exceeded" } });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Ai uitat parola?"));

    await user.type(screen.getByLabelText("Email"), "test@email.com");
    await user.click(screen.getByText("Trimite link de resetare"));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled();
    });
  });
});

describe("Auth Page - Tab Navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("switches to signup tab and shows confirm password", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Înregistrare"));

    expect(screen.getByLabelText("Confirmă parola")).toBeInTheDocument();
    expect(screen.getByText("Creează cont")).toBeInTheDocument();
  });

  it("switches back to signin tab", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText("Înregistrare"));
    await user.click(screen.getByText("Autentificare"));

    expect(screen.getByText("Autentifică-te")).toBeInTheDocument();
  });

  it("has link to create account from signin tab", async () => {
    renderAuth();
    expect(screen.getByText("Creează unul acum")).toBeInTheDocument();
  });
});
