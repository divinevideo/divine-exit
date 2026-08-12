import { Archive, ArrowClockwise, CheckCircle, DownloadSimple, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { buildArchiveFiles, serializeArchiveFiles, type ArchiveFiles } from "@/lib/archive";
import { exportOwnerEvents, OwnerExportError, type ExportProgress } from "@/lib/ownerExportClient";
import { createZip } from "@/lib/zip";
import { fixturePubkey, fixtureScenarioLabels, type FixtureScenario } from "@/fixtures/exportFixtures";
import { createFixtureFetch } from "@/fixtures/fixtureFetch";
import { FixtureSigner } from "@/fixtures/fixtureSigner";

type RunState = "idle" | "running" | "complete" | "failed";

const endpointBase = "https://api.divine.video";

const scenarioOptions = Object.entries(fixtureScenarioLabels) as Array<[FixtureScenario, string]>;

function errorMessage(error: unknown): string {
  if (error instanceof OwnerExportError) {
    return error.message;
  }

  return "The export stopped before an archive could be created. Try again.";
}

function downloadArchive(files: ArchiveFiles): void {
  const zip = createZip(serializeArchiveFiles(files));
  const url = URL.createObjectURL(zip);
  const link = document.createElement("a");
  link.href = url;
  link.download = `divine-export-${files["manifest.json"].pubkey}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [accountId, setAccountId] = useState(fixturePubkey);
  const [scenario, setScenario] = useState<FixtureScenario>("one-page");
  const [state, setState] = useState<RunState>("idle");
  const [progress, setProgress] = useState<ExportProgress>({ pagesFetched: 0, eventsFetched: 0, retryCount: 0 });
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFiles | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!archiveFiles) {
      return null;
    }

    const manifest = archiveFiles["manifest.json"];
    const media = archiveFiles["media.json"];

    return {
      events: manifest.event_count,
      pages: manifest.page_count,
      media: media.length
    };
  }, [archiveFiles]);

  async function runExport() {
    setState("running");
    setFailure(null);
    setArchiveFiles(null);
    setProgress({ pagesFetched: 0, eventsFetched: 0, retryCount: 0 });

    try {
      const result = await exportOwnerEvents({
        endpointBase,
        pubkey: accountId.trim(),
        signer: new FixtureSigner(),
        fetcher: createFixtureFetch(scenario),
        onProgress: setProgress,
        sleep: async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      });
      const files = buildArchiveFiles({
        events: result.events,
        pubkey: accountId.trim(),
        sourceEndpoint: endpointBase,
        pageCount: result.pageCount,
        failures: result.failures
      });

      setArchiveFiles(files);
      setState("complete");
    } catch (error) {
      setFailure(errorMessage(error));
      setState("failed");
    }
  }

  return (
    <main className="app-shell">
      <section className="export-panel" aria-labelledby="page-title">
        <div className="eyebrow">
          <Archive aria-hidden="true" />
          Account export
        </div>
        <h1 id="page-title">Download your Divine archive</h1>
        <p className="intro">
          Create a portable archive of your events from Divine. This first version uses test responses until the live
          export endpoint is available.
        </p>

        <div className="form-grid">
          <label>
            <span>Account identifier</span>
            <input
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label>
            <span>Test response</span>
            <select value={scenario} onChange={(event) => setScenario(event.target.value as FixtureScenario)}>
              {scenarioOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="actions">
          <button type="button" onClick={runExport} disabled={state === "running"}>
            {state === "running" ? <ArrowClockwise className="spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}
            {state === "running" ? "Exporting" : "Create archive"}
          </button>
          <button type="button" className="secondary" onClick={() => archiveFiles && downloadArchive(archiveFiles)} disabled={!archiveFiles}>
            <DownloadSimple aria-hidden="true" />
            Download
          </button>
        </div>

        <div className="progress-strip" aria-live="polite">
          <div>
            <span>{progress.pagesFetched}</span>
            <p>Pages read</p>
          </div>
          <div>
            <span>{progress.eventsFetched}</span>
            <p>Events found</p>
          </div>
          <div>
            <span>{progress.retryCount}</span>
            <p>Retries</p>
          </div>
        </div>

        {state === "complete" && summary && (
          <div className="notice success" role="status">
            <CheckCircle aria-hidden="true" />
            <div>
              <strong>{summary.events === 0 ? "No exportable events were found from Divine." : "Archive ready."}</strong>
              <p>
                {summary.pages} page{summary.pages === 1 ? "" : "s"} read. {summary.events} event
                {summary.events === 1 ? "" : "s"} and {summary.media} media reference{summary.media === 1 ? "" : "s"} included.
              </p>
            </div>
          </div>
        )}

        {state === "failed" && failure && (
          <div className="notice failure" role="alert">
            <WarningCircle aria-hidden="true" />
            <div>
              <strong>Export stopped.</strong>
              <p>{failure}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
