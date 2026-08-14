import { Archive, ArrowClockwise, CheckCircle, DownloadSimple, SignIn, SignOut, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { useDivineSession } from "@/auth/useDivineSession";
import type { DivineSession } from "@/auth/useDivineSession";
import { buildArchiveFiles, serializeArchiveFiles, type ArchiveFiles } from "@/lib/archive";
import { exportOwnerEvents, OwnerExportError, type ExportProgress } from "@/lib/ownerExportClient";
import { createZip } from "@/lib/zip";
import { fixtureScenarioLabels, type FixtureScenario } from "@/fixtures/exportFixtures";
import { createFixtureFetch } from "@/fixtures/fixtureFetch";

type RunState = "idle" | "running" | "complete" | "failed";
type ExportSource = "live" | FixtureScenario;

const endpointBase = "https://api.divine.video";
const isDevFixturesEnabled = import.meta.env.DEV;

const fixtureSourceOptions = Object.entries(fixtureScenarioLabels) as Array<[FixtureScenario, string]>;

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

interface AppProps {
  session: DivineSession;
  initialExportSource?: ExportSource;
}

export function AppContent({ session, initialExportSource = "live" }: AppProps) {
  const [exportSource, setExportSource] = useState<ExportSource>(initialExportSource);
  const [pageLimit, setPageLimit] = useState(500);
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
    if (!session.pubkey || !session.signer) {
      setState("failed");
      setFailure("Sign in, then restart the export.");
      return;
    }

    setState("running");
    setFailure(null);
    setArchiveFiles(null);
    setProgress({ pagesFetched: 0, eventsFetched: 0, retryCount: 0 });

    try {
      const result = await exportOwnerEvents({
        endpointBase,
        pubkey: session.pubkey,
        signer: session.signer,
        fetcher: isDevFixturesEnabled && exportSource !== "live" ? createFixtureFetch(exportSource) : undefined,
        limit: isDevFixturesEnabled ? pageLimit : undefined,
        onProgress: setProgress,
        sleep: async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      });
      const files = buildArchiveFiles({
        events: result.events,
        pubkey: session.pubkey,
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
          Create a portable archive of your events from Divine.
        </p>

        {session.status === "signed-in" && session.pubkey ? (
          <div className="account-row">
            <div>
              <span>Signed in account</span>
              <code>{session.pubkey}</code>
            </div>
            <button type="button" className="secondary" onClick={session.signOut} disabled={state === "running"}>
              <SignOut aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="signed-out">
            <button type="button" onClick={() => void session.signIn()} disabled={session.status === "checking"}>
              {session.status === "checking" ? <ArrowClockwise className="spin" aria-hidden="true" /> : <SignIn aria-hidden="true" />}
              {session.status === "checking" ? "Checking sign-in" : "Sign in with Divine"}
            </button>
          </div>
        )}

        {isDevFixturesEnabled && (
          <details className="dev-tools">
            <summary>Developer test controls</summary>
            <div className="form-grid">
              <label>
                <span>Export source</span>
                <select value={exportSource} onChange={(event) => setExportSource(event.target.value as ExportSource)}>
                  <option value="live">Live endpoint</option>
                  {fixtureSourceOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Page limit</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={pageLimit}
                  onChange={(event) => setPageLimit(Math.min(500, Math.max(1, Number(event.target.value) || 1)))}
                />
              </label>
            </div>
          </details>
        )}

        <div className="actions">
          <button type="button" onClick={runExport} disabled={state === "running" || session.status !== "signed-in"}>
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
                {summary.events === 1 ? "" : "s"} and {summary.media} media reference{summary.media === 1 ? "" : "s"} included
                from Divine. Other relays were not checked.
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

        {session.status === "failed" && session.error && (
          <div className="notice failure" role="alert">
            <WarningCircle aria-hidden="true" />
            <div>
              <strong>Sign-in stopped.</strong>
              <p>{session.error}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const session = useDivineSession();
  return <AppContent session={session} />;
}
