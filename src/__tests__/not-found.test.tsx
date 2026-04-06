import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";

describe("NotFound Page", () => {
  it("renders 404 heading", () => {
    render(<MemoryRouter initialEntries={["/nonexistent"]}><NotFound /></MemoryRouter>);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
  });

  it("renders link to home", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    const link = screen.getByText("Return to Home");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("logs 404 error to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/bad-path"]}><NotFound /></MemoryRouter>);
    expect(consoleSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });
});
