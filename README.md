# Divine Exit

An accessible exit ramp for Divine users moving their account and content to
other infrastructure.

Divine enforces a specific set of moderation policies on Divine-operated
surfaces — our relay (`wss://relay.divine.video`) and our media host
(`divine-blossom`). Some users will want moderation policies other than the ones
we enforce, or infrastructure better suited to their content. Others are
suspended and can no longer post here.

All of those users can already move. On Divine, an account is a Nostr keypair
that Divine does not own and cannot revoke, videos are content-addressed files
rather than rows in our database, and a user's events exist on relays besides
ours. Other relays, media hosts, and apps accept all of it as it stands.

Moving today requires knowing what a relay is, which relays hold your events,
where your media is stored, how to copy it to another host, and how to rewrite
your own events to reference the new location. That is reasonable to expect from
a Nostr developer and not from someone who joined Divine to post six-second
videos.

This repo is the tool that closes that gap: sign in, get your keys, choose a
destination relay and Blossom server, and move your content there.

## Status

Early. See the [issues](https://github.com/divinevideo/divine-exit/issues) for
scope, open questions, and acceptance criteria before starting work.

The current web app implements the first archive-export slice against fixture
responses. It can build an archive containing:

- `events.json` — raw signed events exactly as returned by the source.
- `manifest.json` — source, pubkey, generated timestamp, counts, pages, and
  failures.
- `media.json` — media URLs and hashes discovered from event tags.

Live owner-export validation is gated on production auth wiring and a known test
account. Run `npm run smoke:live-export-gate` to confirm the public route is
serving a NIP-98 response before attempting signed validation.

## What it does

1. Sign in with an existing Divine method — Keycast OAuth, bunker (NIP-46), or
   bring-your-own-key.
2. Explain the account's situation in plain language, whether the user is
   suspended or moving by choice.
3. Export the user's keys, for users who have never handled their own nsec.
4. Choose a destination Blossom server and relay.
5. Copy media to the destination, republish events pointing at it, and update
   the user's relay and server lists so other apps follow them automatically.

A downloadable archive of events and media is always offered, whether or not the
server-to-server copy succeeds.

## Protocol background

Divine is built on [Nostr](https://github.com/nostr-protocol/nips). The pieces
this tool relies on:

- **NIP-65** — relay list metadata (kind 10002), how other clients learn where a
  user publishes.
- **NIP-71** — addressable short video events (kind 34236).
- **[Blossom](https://github.com/hzrd149/blossom)** — content-addressed media
  storage. A file's name *is* its SHA-256, which makes copying between servers
  idempotent and verifiable. Files are never modified in place; doing so breaks
  every reference to them.
- **BUD-04** — server-to-server blob mirroring, the mechanism used to copy media
  to a destination host.

## Non-goals

This is not an appeals interface, a directory or ranking of destination servers,
a guarantee that any destination accepts the content, or a deletion tool.
Deletion is a separate, already-built flow.

## Contributing

This repo touches no Divine-internal moderation logic and only documented
protocol surfaces, so it is a reasonable place to contribute from outside the
core team. Start from an open issue.

Useful commands:

```bash
npm i
npm run dev
npm test
npm run smoke:live-export-gate
```

## License

[Mozilla Public License 2.0](LICENSE).
