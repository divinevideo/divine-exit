import type { NostrSigner } from "./nostr";

const METHODS_WITH_PAYLOAD = new Set(["POST", "PUT", "PATCH"]);

function normalizeUrl(url: string): string {
  const fragmentIndex = url.indexOf("#");
  return fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
}

async function sha256Hex(body: string): Promise<string> {
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64Encode(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  return Buffer.from(value, "utf8").toString("base64");
}

export async function createNip98AuthHeader(
  signer: NostrSigner,
  url: string,
  method = "GET",
  body?: string
): Promise<string> {
  const normalizedMethod = method.toUpperCase();
  const tags: string[][] = [
    ["u", normalizeUrl(url)],
    ["method", normalizedMethod]
  ];

  if (body !== undefined && METHODS_WITH_PAYLOAD.has(normalizedMethod)) {
    tags.push(["payload", await sha256Hex(body)]);
  }

  const signedEvent = await signer.signEvent({
    kind: 27235,
    content: "",
    tags,
    created_at: Math.floor(Date.now() / 1000)
  });

  return `Nostr ${base64Encode(JSON.stringify(signedEvent))}`;
}
