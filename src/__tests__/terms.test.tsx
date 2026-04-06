import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Terms from "@/pages/Terms";

describe("Terms Page", () => {
  it("renders the title", () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText("Termeni și Condiții")).toBeInTheDocument();
  });

  it("renders back link", () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText("Înapoi acasă")).toBeInTheDocument();
  });

  it("renders acceptance section", () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText("1. Acceptarea termenilor")).toBeInTheDocument();
  });
});
