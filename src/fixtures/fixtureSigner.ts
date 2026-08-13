import type { NostrEvent, NostrSigner } from "@/lib/nostr";
import { fixturePubkey } from "./exportFixtures";

export class FixtureSigner implements NostrSigner {
  public readonly signedUrls: string[] = [];

  async signEvent(event: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
  }): Promise<NostrEvent> {
    const url = event.tags.find(([name]) => name === "u")?.[1];
    if (url) {
      this.signedUrls.push(url);
    }

    return {
      id: "9999999999999999999999999999999999999999999999999999999999999999",
      pubkey: fixturePubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: "88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888"
    };
  }
}
