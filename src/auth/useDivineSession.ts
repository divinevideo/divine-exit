import type { StoredCredentials, TokenResponse } from "@divinevideo/login";
import { useCallback, useEffect, useMemo, useState } from "react";

import { isHex64, type NostrSigner } from "@/lib/nostr";
import { createDivineLoginClient, type DivineLoginClient } from "./divineLoginClient";
import { DivineRpcSigner } from "./divineRpcSigner";

type SessionStatus = "checking" | "signed-out" | "signed-in" | "failed";

export interface DivineSession {
  status: SessionStatus;
  pubkey: string | null;
  signer: NostrSigner | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

function clearOAuthQuery(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function tokenResponseFromStoredCredentials(credentials: StoredCredentials): TokenResponse | null {
  if (!credentials.accessToken) {
    return null;
  }

  return {
    bunker_url: credentials.bunkerUrl,
    access_token: credentials.accessToken,
    token_type: "Bearer",
    expires_in: credentials.expiresAt ? Math.max(0, Math.floor((credentials.expiresAt - Date.now()) / 1000)) : 0,
    authorization_handle: credentials.authorizationHandle,
    refresh_token: credentials.refreshToken
  };
}

function errorMessage(): string {
  return "Divine sign-in did not finish. Try again.";
}

export function useDivineSession(providedClient?: DivineLoginClient): DivineSession {
  const client = useMemo(() => providedClient ?? createDivineLoginClient(), [providedClient]);
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [signer, setSigner] = useState<DivineRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(
    async (credentials: StoredCredentials | TokenResponse | null) => {
      if (!credentials) {
        setStatus("signed-out");
        setPubkey(null);
        setSigner(null);
        return;
      }

      const tokenResponse =
        "bunker_url" in credentials ? credentials : tokenResponseFromStoredCredentials(credentials);
      const rpc = tokenResponse ? client.createRpc(tokenResponse) : null;

      if (!rpc) {
        setStatus("signed-out");
        setPubkey(null);
        setSigner(null);
        return;
      }

      const nextSigner = new DivineRpcSigner(rpc);
      const nextPubkey = await nextSigner.getPublicKey();
      if (!isHex64(nextPubkey)) {
        throw new Error("Divine sign-in returned an account identifier this tool could not read.");
      }

      setPubkey(nextPubkey);
      setSigner(nextSigner);
      setStatus("signed-in");
    },
    [client]
  );

  useEffect(() => {
    let active = true;

    async function initialize() {
      setStatus("checking");
      setError(null);

      try {
        const callback = client.oauth.parseCallback(window.location.href);
        if ("error" in callback && callback.error !== "missing_code") {
          clearOAuthQuery();
          throw new Error(callback.description ?? "Divine sign-in did not finish.");
        }

        if ("code" in callback) {
          const tokens = await client.oauth.exchangeCode(callback.code);
          clearOAuthQuery();
          if (active) {
            await loadSession(tokens);
          }
          return;
        }

        const credentials = await client.oauth.getSessionWithRefresh();
        if (active) {
          await loadSession(credentials);
        }
      } catch {
        if (active) {
          setStatus("failed");
          setPubkey(null);
          setSigner(null);
          setError(errorMessage());
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [client, loadSession]);

  const signIn = useCallback(async () => {
    setError(null);
    const { url } = await client.oauth.getAuthorizationUrl();
    window.location.assign(url);
  }, [client]);

  const signOut = useCallback(() => {
    client.oauth.logout();
    setStatus("signed-out");
    setPubkey(null);
    setSigner(null);
    setError(null);
  }, [client]);

  return useMemo(
    () => ({ status, pubkey, signer, error, signIn, signOut }),
    [status, pubkey, signer, error, signIn, signOut]
  );
}
