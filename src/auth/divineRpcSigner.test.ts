import { describe, expect, it } from "vitest";

import { DivineRpcSigner } from "./divineRpcSigner";

describe("DivineRpcSigner", () => {
  it("adds the cached pubkey when delegating signing to Divine RPC", async () => {
    const signedEvents: unknown[] = [];
    const rpc = {
      getPublicKey: async () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      signEvent: async (event: {
        kind: number;
        content: string;
        tags: string[][];
        created_at: number;
        pubkey: string;
      }) => {
        signedEvents.push(event);
        return {
          ...event,
          id: "1111111111111111111111111111111111111111111111111111111111111111",
          sig: "88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888"
        };
      }
    };

    const signer = new DivineRpcSigner(rpc);
    const signed = await signer.signEvent({
      kind: 27235,
      content: "",
      tags: [["u", "https://api.divine.video/api/users/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/export/events"]],
      created_at: 1
    });

    expect(signed.pubkey).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(signedEvents).toEqual([
      {
        kind: 27235,
        content: "",
        tags: [["u", "https://api.divine.video/api/users/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/export/events"]],
        created_at: 1,
        pubkey: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    ]);
  });
});
