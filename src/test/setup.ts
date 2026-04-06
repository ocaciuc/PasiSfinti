import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
      insert: vi.fn(),
    })),
  },
}));

// Mock avatar upload
vi.mock("@/lib/avatar-upload", () => ({
  uploadAvatar: vi.fn().mockResolvedValue("https://example.com/avatar.jpg"),
}));

// Mock capacitor storage
vi.mock("@/lib/capacitor-storage", () => ({
  capacitorStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));
