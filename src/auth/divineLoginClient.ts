import { createDivineClient } from "@divinevideo/login";

export const divineLoginServerUrl = "https://login.divine.video";
export const divineLoginClientId = "divine-exit";

export type DivineLoginClient = ReturnType<typeof createDivineClient>;

export function createDivineLoginClient(): DivineLoginClient {
  return createDivineClient({
    serverUrl: divineLoginServerUrl,
    clientId: divineLoginClientId,
    redirectUri: `${window.location.origin}/`,
    storage: window.localStorage
  });
}
