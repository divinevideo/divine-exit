import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("runs a fixture export and reports the archive summary", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("Archive ready.")).toBeInTheDocument());
    expect(screen.getByText(/1 page read. 1 event and 1 media reference included./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });

  it("uses distinct empty export copy", async () => {
    render(<App />);

    await userEvent.selectOptions(screen.getByLabelText(/test response/i), "empty");
    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("No exportable events were found from Divine.")).toBeInTheDocument());
    expect(screen.queryByText("Archive ready.")).not.toBeInTheDocument();
  });

  it("shows a plain failure state", async () => {
    render(<App />);

    await userEvent.selectOptions(screen.getByLabelText(/test response/i), "auth-failure");
    await userEvent.click(screen.getByRole("button", { name: /create archive/i }));

    await waitFor(() => expect(screen.getByText("Export stopped.")).toBeInTheDocument());
    expect(screen.getByText("Sign in again, then restart the export.")).toBeInTheDocument();
  });
});
