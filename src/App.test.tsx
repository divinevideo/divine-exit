import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NostrEvent, NostrSigner } from "@/lib/nostr";
import { describe, expect, it } from "vitest";

import type { DivineSession } from "@/auth/useDivineSession";
import { fixturePubkey } from "@/fixtures/exportFixtures";
import { AppContent } from "./App";

class TestSigner implements NostrSigner {
  async signEvent(event: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
  }): Promise<NostrEvent> {
    return {
      ...event,
      id: "9999999999999999999999999999999999999999999999999999999999999999",
      pubkey: fixturePubkey,
      sig: "88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888"
    };
  }
}

function makeSession(overrides: Partial<DivineSession> = {}): DivineSession {
  return {
    status: "signed-in",
    pubkey: fixturePubkey,
    signer: new TestSigner(),
    error: null,
    signIn: async () => undefined,
    signOut: () => undefined,
    ...overrides
  };
}

describe("App", () => {
  it("shows sign-in and hides export controls while signed out", () => {
    render(<AppContent session={makeSession({ status: "signed-out", pubkey: null, signer: null })} />);

    expect(screen.getByRole("button", { name: /sign in with divine/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create archive/i })).toBeDisabled();
    expect(screen.queryByText(fixturePubkey)).not.toBeInTheDocument();
  });

  it("renders the full signed-in pubkey", () => {
    render(<AppContent session={makeSession()} />);

    expect(screen.getByText(fixturePubkey)).toBeInTheDocument();
  });

  it("runs a fixture export and reports the archive summary", async () => {
    render(<AppContent session={makeSession()} />);

    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("Archive ready.")).toBeInTheDocument());
    expect(
      screen.getByText(/1 page read. 1 event and 1 media reference included from Divine. Other relays were not checked./)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });

  it("uses distinct empty export copy", async () => {
    render(<AppContent session={makeSession()} />);

    await userEvent.selectOptions(screen.getByLabelText(/export source/i), "empty");
    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("No exportable events were found from Divine.")).toBeInTheDocument());
    expect(screen.queryByText("Archive ready.")).not.toBeInTheDocument();
  });

  it("shows a plain failure state", async () => {
    render(<AppContent session={makeSession()} />);

    await userEvent.selectOptions(screen.getByLabelText(/export source/i), "auth-failure");
    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("Export stopped.")).toBeInTheDocument());
    expect(screen.getByText("Sign in again, then restart the export.")).toBeInTheDocument();
  });
});
