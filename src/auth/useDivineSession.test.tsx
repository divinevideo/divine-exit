import type { TokenResponse } from "@divinevideo/login";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DivineLoginClient } from "./divineLoginClient";
import { useDivineSession } from "./useDivineSession";

const pubkey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function makeClient(overrides: Partial<DivineLoginClient> = {}): DivineLoginClient {
  const tokens: TokenResponse = {
    bunker_url: "bunker://test",
    access_token: "access-token",
    token_type: "Bearer",
    expires_in: 3600
  };

  return {
    oauth: {
      parseCallback: vi.fn(() => ({ error: "missing_code", description: "No authorization code in callback URL" })),
      exchangeCode: vi.fn(async () => tokens),
      getSessionWithRefresh: vi.fn(async () => null),
      logout: vi.fn(),
      getAuthorizationUrl: vi.fn(async () => ({ url: "https://login.divine.video/oauth", pkce: { verifier: "v", challenge: "c" } }))
    },
    createRpc: vi.fn(() => ({
      getPublicKey: vi.fn(async () => pubkey),
      signEvent: vi.fn(async (event) => ({
        ...event,
        id: "1111111111111111111111111111111111111111111111111111111111111111",
        sig: "88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888"
      }))
    })),
    ...overrides
  } as DivineLoginClient;
}

function makeOAuth(overrides: Record<string, unknown> = {}) {
  return {
    ...makeClient().oauth,
    ...overrides
  } as DivineLoginClient["oauth"];
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("useDivineSession", () => {
  it("exchanges callback code, clears the query string, and exposes a signer", async () => {
    window.history.replaceState({}, "", "/?code=oauth-code&state=123");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const client = makeClient({
      oauth: makeOAuth({
        parseCallback: vi.fn(() => ({ code: "oauth-code" }))
      })
    });

    const { result } = renderHook(() => useDivineSession(client));

    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(client.oauth.exchangeCode).toHaveBeenCalledWith("oauth-code");
    expect(replaceState).toHaveBeenCalledWith({}, expect.any(String), "/");
    expect(result.current.pubkey).toBe(pubkey);
    await expect(result.current.signer?.signEvent({ kind: 1, content: "", tags: [], created_at: 1 })).resolves.toMatchObject({
      pubkey
    });
  });

  it("restores a stored session", async () => {
    const client = makeClient({
      oauth: makeOAuth({
        getSessionWithRefresh: vi.fn(async () => ({
          bunkerUrl: "bunker://test",
          accessToken: "access-token",
          expiresAt: Date.now() + 3600_000
        }))
      })
    });

    const { result } = renderHook(() => useDivineSession(client));

    await waitFor(() => expect(result.current.status).toBe("signed-in"));
    expect(result.current.pubkey).toBe(pubkey);
  });

  it("signs out through the Divine client and clears session state", async () => {
    const client = makeClient({
      oauth: makeOAuth({
        getSessionWithRefresh: vi.fn(async () => ({
          bunkerUrl: "bunker://test",
          accessToken: "access-token",
          expiresAt: Date.now() + 3600_000
        }))
      })
    });

    const { result } = renderHook(() => useDivineSession(client));
    await waitFor(() => expect(result.current.status).toBe("signed-in"));

    act(() => {
      result.current.signOut();
    });

    expect(client.oauth.logout).toHaveBeenCalled();
    expect(result.current.status).toBe("signed-out");
    expect(result.current.pubkey).toBeNull();
    expect(result.current.signer).toBeNull();
  });

  it("does not expose credential-like auth errors", async () => {
    window.history.replaceState({}, "", "/?code=oauth-code");
    const client = makeClient({
      oauth: makeOAuth({
        parseCallback: vi.fn(() => ({ code: "oauth-code" })),
        exchangeCode: vi.fn(async () => {
          throw new Error("access-token refresh-token nsec1secret");
        })
      })
    });

    const { result } = renderHook(() => useDivineSession(client));

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.error).toBe("Divine sign-in did not finish. Try again.");
    expect(result.current.error).not.toContain("access-token");
    expect(result.current.error).not.toContain("refresh-token");
    expect(result.current.error).not.toContain("nsec1secret");
  });
});
