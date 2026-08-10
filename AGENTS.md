# Repository Guidelines

## Divine Context And Brain

Before broad product, architecture, protocol, cross-repo, service-boundary, or pull-request authoring, review, or modification work, read the shared Divine context primer.

Resolve the context directory and clone it there if it is missing:

```bash
CONTEXT_DIR="${DIVINE_CONTEXT_ROOT:-../divine-context}"
[ -e "$CONTEXT_DIR/.git" ] || gh repo clone divinevideo/divine-context "$CONTEXT_DIR"
```

Use that value as `<context-dir>` below.

The `divine-context` repo is private, so cloning requires GitHub access. If clone, network, or auth fails, continue from the local repo docs and avoid cross-repo assumptions.

Before updating an existing context checkout, verify it is clean and on its default branch. If it is clean and on the default branch, update it with `git -C <context-dir> pull --ff-only`. If it is dirty, on another branch, cannot fast-forward, or network/auth fails, leave it untouched and say the context may be stale.

Read `<context-dir>/AGENT_CONTEXT.md` and follow its instructions. If unavailable, continue from the local repo docs and avoid cross-repo assumptions.

Before working on a pull request, follow `<context-dir>/PR_REVIEW.md` and use `<context-dir>/PR_REVIEW_TEAMS.md` to request the normal team and check takeover authority. Ordinary review remains open to any eligible Divine human. Before modifying a pull-request branch, enforce the mapping and every takeover gate; if the mapping cannot be read, feedback-only review may continue but automated takeover must stop. Request and verify required human review automatically when tooling permits. If the runbook is unavailable, leave the pull request open and report the blocker.

If a Divine Brain search or ask tool is available, you may use it for company memory. Treat it as optional and credentialed: tool names vary by client, and work must continue when Brain is unavailable. When Brain results influence work, cite the returned document ids. Never commit Brain credentials or expose Brain-derived sensitive content in public PRs, issues, branch names, commit messages, code comments, logs, screenshots, release notes, or externally shared agent transcripts.

## This Repo Is Public

`divine-exit` is a public repository, and its visibility is deliberate: the tool
is evidence that account portability on Divine is real and usable. Keep it that
way.

- Never commit Divine-internal moderation logic, enforcement thresholds,
  internal service topology, or anything sourced from private Divine repos.
- Describe enforcement only in terms a user can already observe. "Posting access
  on Divine's servers is suspended" is fine. Internal mechanics are not.
- Keep vulnerability details and attack rationale out of issues, pull requests,
  commit messages, and code comments. Track remediation work only.

## Scope

This tool helps a user move their account and content from Divine-operated
infrastructure to infrastructure of their choosing. It is not an appeals
interface, not a directory or ranking of destination servers, and not a deletion
tool.

Suspended users and users moving by choice are both first-class. Do not write
copy or logic that assumes the user is being removed.

## Protocol Rules

- **Never truncate Nostr identifiers.** Full-length npub, nsec, and event IDs in
  UI, logs, exports, tests, and error messages, without exception.
- **Never modify a media file.** Blossom filenames are the SHA-256 of their
  contents. Re-encoding, changing containers, or "optimizing" a file breaks every
  reference to it. Copy bytes verbatim.
- **Never log, cache, or transmit key material.** An exported nsec belongs on the
  user's screen and nowhere else — not in logs, metrics, error reports, or
  analytics.
- Verify protocol details against the current specs rather than against this
  file. Where a spec and a doc disagree, the spec wins.

## Reuse Before Building

Most of what this tool needs already exists elsewhere in the Divine
organization. Check before writing anything new:

| Need | Existing primitive |
|---|---|
| Key export | Keycast `/api/user/export-key` |
| Server-to-server media copy | `divine-blossom` BUD-04 `PUT /mirror` |
| List a user's media | Blossom BUD-02 `GET /list/<pubkey>` |
| Relay-to-relay event sync | `divine-relay-sync` (NIP-77 negentropy) |
| Auth over REST RPC | `divine-login` |
| Rewriting media URLs on events | `divine-vine-migrate` |

If the implementation appears to need a new protocol concept, that is a signal
the approach is wrong. Re-read the specs first.

## Keep It Small

This tool is expected to run a few dozen times a year. A single-page app that
walks a list and reports results is the right amount of machinery. No job queue,
no worker pool, no resumable state machine.

Prefer honest, specific failure messages over retry logic. Re-running is safe by
construction, because content-addressed mirroring is idempotent.

## Writing Style

User-facing copy follows `brand-guidelines/`. In this repo specifically: plain,
declarative, and neutral. No retention prompts, no "are you sure," and nothing
that reads as reluctant about a user moving on.

## Pull Requests

- Branch from `origin/main`; every PR targets `main`.
- No stacked PRs. If two changes depend on each other, ship them together.
- No deferred work: no `TODO` without a tracking issue, no commented-out code,
  no skipped tests.
- Include tests with the change.
