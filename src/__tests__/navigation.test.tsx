import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navigation from "@/components/Navigation";

const renderNav = (path = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>
  );

describe("Navigation", () => {
  it("renders all 4 nav items", () => {
    renderNav();
    expect(screen.getByText("Acasă")).toBeInTheDocument();
    expect(screen.getByText("Pelerinaje")).toBeInTheDocument();
    expect(screen.getByText("Lumânare")).toBeInTheDocument();
    expect(screen.getByText("Profil")).toBeInTheDocument();
  });

  it("highlights active route", () => {
    renderNav("/dashboard");
    const link = screen.getByText("Acasă").closest("a");
    expect(link).toHaveClass("text-accent");
  });

  it("does not highlight inactive routes", () => {
    renderNav("/dashboard");
    const link = screen.getByText("Pelerinaje").closest("a");
    expect(link).toHaveClass("text-muted-foreground");
  });

  it("links to correct paths", () => {
    renderNav();
    expect(screen.getByText("Acasă").closest("a")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Pelerinaje").closest("a")).toHaveAttribute("href", "/pilgrimages");
    expect(screen.getByText("Lumânare").closest("a")).toHaveAttribute("href", "/candle");
    expect(screen.getByText("Profil").closest("a")).toHaveAttribute("href", "/profile");
  });

  it("highlights pilgrimages when on pilgrimages route", () => {
    renderNav("/pilgrimages");
    const link = screen.getByText("Pelerinaje").closest("a");
    expect(link).toHaveClass("text-accent");
    const homeLink = screen.getByText("Acasă").closest("a");
    expect(homeLink).toHaveClass("text-muted-foreground");
  });
});
