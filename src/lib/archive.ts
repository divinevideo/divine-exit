import { isHex64, type NostrEvent } from "./nostr";
import type { OwnerExportError } from "./ownerExportClient";

export interface MediaReference {
  event_id: string;
  tag: string;
  url: string;
  sha256: string | null;
}

export interface ArchiveManifest {
  pubkey: string;
  generated_at: string;
  event_count: number;
  source_name: string;
  source_endpoint: string;
  page_count: number;
  failures: Array<{
    code: string;
    message: string;
    status?: number;
  }>;
}

export interface ArchiveFiles {
  "events.json": NostrEvent[];
  "manifest.json": ArchiveManifest;
  "media.json": MediaReference[];
}

const URL_TAGS = new Set(["url", "image", "thumb", "thumbnail"]);

function basenameHash(url: string): string | null {
  try {
    const parsed = new URL(url);
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const hash = lastPart.split(".")[0];
    return isHex64(hash) ? hash.toLowerCase() : null;
  } catch {
    return null;
  }
}

function readImeta(tag: string[]): { url: string | null; sha256: string | null } {
  let url: string | null = null;
  let sha256: string | null = null;

  for (const value of tag.slice(1)) {
    const [key, ...rest] = value.split(" ");
    const body = rest.join(" ");

    if (key === "url" && body) {
      url = body;
    }
    if (key === "x" && isHex64(body)) {
      sha256 = body.toLowerCase();
    }
  }

  return { url, sha256 };
}

export function discoverMediaReferences(events: NostrEvent[]): MediaReference[] {
  const references: MediaReference[] = [];

  for (const event of events) {
    for (const tag of event.tags) {
      const [name, value] = tag;
      if (!name) {
        continue;
      }

      if (URL_TAGS.has(name) && value) {
        references.push({
          event_id: event.id,
          tag: name,
          url: value,
          sha256: tag.find((part) => isHex64(part))?.toLowerCase() ?? basenameHash(value)
        });
      }

      if (name === "imeta") {
        const imeta = readImeta(tag);
        if (imeta.url) {
          references.push({
            event_id: event.id,
            tag: name,
            url: imeta.url,
            sha256: imeta.sha256 ?? basenameHash(imeta.url)
          });
        }
      }
    }
  }

  return references;
}

export function buildArchiveFiles(input: {
  events: NostrEvent[];
  pubkey: string;
  sourceEndpoint: string;
  pageCount: number;
  failures: OwnerExportError[];
  generatedAt?: Date;
}): ArchiveFiles {
  return {
    "events.json": input.events,
    "manifest.json": {
      pubkey: input.pubkey,
      generated_at: (input.generatedAt ?? new Date()).toISOString(),
      event_count: input.events.length,
      source_name: "Divine relay",
      source_endpoint: input.sourceEndpoint,
      page_count: input.pageCount,
      failures: input.failures.map((failure) => ({
        code: failure.code,
        message: failure.message,
        status: failure.status
      }))
    },
    "media.json": discoverMediaReferences(input.events)
  };
}

export function serializeArchiveFiles(files: ArchiveFiles): Record<string, string> {
  return {
    "events.json": `${JSON.stringify(files["events.json"], null, 2)}\n`,
    "manifest.json": `${JSON.stringify(files["manifest.json"], null, 2)}\n`,
    "media.json": `${JSON.stringify(files["media.json"], null, 2)}\n`
  };
}
