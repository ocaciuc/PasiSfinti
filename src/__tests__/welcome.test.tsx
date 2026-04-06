import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock image import
vi.mock("@/assets/hero-bg.png", () => ({ default: "hero-bg.png" }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Welcome from "@/pages/Welcome";

describe("Welcome Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the app title", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByText("Pași de Pelerin")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByText("Bun venit pe drumul tău spiritual")).toBeInTheDocument();
  });

  it("renders auth button", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByText("Autentificare / Înregistrare")).toBeInTheDocument();
  });

  it("navigates to /auth on button click", async () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    await userEvent.click(screen.getByText("Autentificare / Înregistrare"));
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it("renders privacy and terms links", () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByText("Politica de confidențialitate")).toBeInTheDocument();
    expect(screen.getByText("Termeni și condiții")).toBeInTheDocument();
  });
});
