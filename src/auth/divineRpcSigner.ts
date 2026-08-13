import type { DivineRpc } from "@divinevideo/login";

import type { NostrEvent, NostrSigner } from "@/lib/nostr";

type DivineRpcSigningClient = Pick<DivineRpc, "getPublicKey" | "signEvent">;

export class DivineRpcSigner implements NostrSigner {
  private cachedPubkey: string | null = null;

  constructor(private readonly rpc: DivineRpcSigningClient) {}

  async getPublicKey(): Promise<string> {
    if (!this.cachedPubkey) {
      this.cachedPubkey = await this.rpc.getPublicKey();
    }

    return this.cachedPubkey;
  }

  async signEvent(event: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
  }): Promise<NostrEvent> {
    const pubkey = await this.getPublicKey();
    return this.rpc.signEvent({ ...event, pubkey });
  }
}
