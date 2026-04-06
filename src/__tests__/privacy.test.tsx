import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Privacy from "@/pages/Privacy";

describe("Privacy Page", () => {
  it("renders the title", () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>);
    expect(screen.getByText("Politica de Confidențialitate")).toBeInTheDocument();
  });

  it("renders back link", () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>);
    expect(screen.getByText("Înapoi acasă")).toBeInTheDocument();
  });

  it("renders last update date", () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>);
    expect(screen.getByText(/Ultima actualizare/)).toBeInTheDocument();
  });

  it("renders introduction section", () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>);
    expect(screen.getByText("1. Introducere")).toBeInTheDocument();
  });
});
