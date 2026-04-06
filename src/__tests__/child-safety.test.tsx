import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChildSafety from "@/pages/ChildSafety";

describe("ChildSafety Page", () => {
  it("renders the back button", () => {
    render(<MemoryRouter><ChildSafety /></MemoryRouter>);
    expect(screen.getByText("Înapoi")).toBeInTheDocument();
  });

  it("renders the page content", () => {
    render(<MemoryRouter><ChildSafety /></MemoryRouter>);
    // The page should have content about child safety
    expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
