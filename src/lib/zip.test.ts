import { describe, expect, it } from "vitest";

import { createZip, createZipBytes } from "./zip";

describe("createZip", () => {
  it("creates a zip blob with the expected content type", async () => {
    const zipBytes = createZipBytes({
      "events.json": "[]\n",
      "manifest.json": "{}\n",
      "media.json": "[]\n"
    });
    const zip = createZip({
      "events.json": "[]\n",
      "manifest.json": "{}\n",
      "media.json": "[]\n"
    });

    expect(zip.type).toBe("application/zip");
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
  });
});
