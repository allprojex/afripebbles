import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { RequireAdmin } from "./RequireAdmin";

const mockUseAdminAuth = vi.fn();

vi.mock("../context/AdminAuthContext", () => ({
  useAdminAuth: () => mockUseAdminAuth(),
}));

function renderGuarded() {
  return render(
    <Router base="">
      <RequireAdmin>
        <div>Secret admin content</div>
      </RequireAdmin>
    </Router>,
  );
}

describe("RequireAdmin", () => {
  it("shows a configuration notice when Supabase auth isn't set up", () => {
    mockUseAdminAuth.mockReturnValue({ isConfigured: false, isLoading: false, isAdmin: false });
    renderGuarded();
    expect(screen.getByText(/isn't configured yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret admin content")).not.toBeInTheDocument();
  });

  it("shows a loading state while the session is being checked", () => {
    mockUseAdminAuth.mockReturnValue({ isConfigured: true, isLoading: true, isAdmin: false });
    renderGuarded();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret admin content")).not.toBeInTheDocument();
  });

  it("never renders protected content for a signed-out or non-admin user", () => {
    mockUseAdminAuth.mockReturnValue({ isConfigured: true, isLoading: false, isAdmin: false });
    renderGuarded();
    expect(screen.queryByText("Secret admin content")).not.toBeInTheDocument();
  });

  it("renders protected content once confirmed as an admin", () => {
    mockUseAdminAuth.mockReturnValue({ isConfigured: true, isLoading: false, isAdmin: true });
    renderGuarded();
    expect(screen.getByText("Secret admin content")).toBeInTheDocument();
  });
});
