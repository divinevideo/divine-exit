export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrSigner {
  signEvent(event: {
    kind: number;
    content: string;
    tags: string[][];
    created_at: number;
  }): Promise<NostrEvent>;
}

export function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}
