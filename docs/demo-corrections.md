# Demo corrections — 9 November 2026

Scope: the independent localhost presentation. No external service, publication, catalog reset, or changes to Manuel's integration.

## Six requested corrections

| Item | Result | Evidence |
|---|---|---|
| Active navigation | Implemented | Route-based state, one active section, history-entry detail context, reload/back/forward, Artist/Investor changes, mobile profile context for Saved. Landing does not select Home. |
| Real musical video | Completed in the subsequent polish pass | Post 11 now uses a genuine generated performance clip with moving musicians, local audio, proportional playback and integrated comments. See `demo-polish.md`. |
| Integrated comments | Implemented | Desktop side panel redistributes the feed. Mobile bottom sheet retains visible media and has its own comment scroll and composer. VisualViewport handling reduces the composer when the software keyboard reduces the viewport. Posting updates shared counts without replacing the media element or changing the active post. |
| Saved | Implemented | Desktop sidebar; mobile profile and More menu. A new account starts empty. Opening, playback, removing and reloading were verified. No new save types were introduced. |
| Create/find opportunities | Implemented | Optional opportunity setup in Create Project, exact song scope, reference selection/upload, deliverable/compensation/terms, preview, draft versus publication. Existing projects use the same fields through Add opportunity. Public profiles show current opportunities separately from historical credits. Home still groups by project. |
| Prepare/send proposals | Implemented | Exact offer reference and artist, real waveform, local prepared take only for its matching reference, own upload, full-track rendering with actual gain changes, synchronized A/B, simple-file alternative. Mix/Master accept a complete replacement recording. Private SQLite drafts resume from `+ → Continue a draft`. Only Send creates a request. Recipient gets reference, proposal and snapshotted terms in the original thread. |

## Manual browser rehearsal

Protagonist created through registration and onboarding: **Sol Rivera**, `sol.rivera@nebula.local`, password `Nebula2026!`, artist 19.

- Completed identity, creative roles, opportunity preferences and availability. Home used the Feature preference.
- Posted comments on Meridian, confirmed count and account attribution, closed/reopened the integrated panel. Desktop and 390×844 mobile inspected.
- Started with empty Saved; saved Meridian, opened Saved, reloaded, removed it, reloaded again and confirmed empty.
- Created **Luz de regreso**, project 20, with two songs: Ventana (9) and Luz de regreso (10). Published Feature opportunity 11 specifically for song 10 with uploaded audio reference.
- Found that opportunity from Club Marea's account via Sol's public Collaborations tab. It loaded song 10, not song 9. Uploaded and sent a simple audio proposal.
- Sol prepared a musical proposal for Marea Alta using its exact prepared take, rendered the result, compared it, saved privately, reloaded, then sent. Thread **6** was reviewed and accepted by Club Marea. A new chat message persisted on that same thread after reload.
- Club Marea's proposal to Sol arrived as a notification. Sol declined it with an optional response. Thread **7** remains rejected after reload, includes the response, and has messages disabled.
- Sol also prepared the separate Afterglow take and saved a private draft for offer **1**. It is discoverable from `+ → Continue a draft`; it was not sent or published.
- Two rendered results were checked against their own decoded originals. The additional signal is nonzero for both; see `verification/corrections/audio-difference.json`. This is signal verification, not a claim of a human listening session.

The subsequent polish pass completed the real-video integration and rehearsal. Mobile screenshots and desktop browser viewport tests were performed; a physical phone's software keyboard was not exercised.

## Validation

- Production build and TypeScript checks passed. Existing Vite source-map/chunk-size warnings remain non-blocking.
- 83 server tests passed, including the new reference scope, private draft permissions, restart persistence and same-thread acceptance/rejection test.
- The new server regression also passed after adding repeated restoration from an old snapshot without a proposal-drafts table and rejecting stale draft saves after a request has already been sent.
- 8 presentation browser tests passed across desktop/mobile: the complete corrected flow, navigation/history/persona, full-track Mix, and the existing Remix flow with external traffic blocked.
- 36 existing collaboration browser tests passed (notifications, permissions, requests, revisions, acceptance, rejection, messages, delivery and completion). Details are recorded in `verification/corrections/results.json`.
- Browser tests use disposable database copies. The visible local scenario retains the manual rehearsal and Sol as the protagonist.

## Run and restore

From the `nebula_v1` directory:

```sh
pnpm start
# http://127.0.0.1:4174
```

Backstage: `/presentation` or Ctrl/Cmd+Shift+P. Original actor accounts and controls are documented in `presentation-runbook.md`.

```sh
pnpm demo:reset
```

The subsequent prepared checkpoint now preserves Sol, the rehearsal activity and private Afterglow proposal. Explicit reset restores that checkpoint and reconnects Sol. Old baseline schemas still clear only proposal tables absent from their snapshot. The active catalog was not reseeded.

Backup before this pass: `.data/corrections-backups/20261109-101047/` (active and baseline SQLite snapshots). The earlier media/test backup remains intact.

`python3 scripts/attach-presentation-references.py` is an idempotent, narrowly mapped update for existing curated offers and their recordings. It was applied to active and baseline databases; it does not reseed accounts, projects, posts or relationships.

## Local simulation boundaries

- Proposal preparation reuses the Remix audio renderer and comparison component. It uploads normal private work files, without publishing a Remix or requiring remix permission for a collaboration application.
- Layer rendering currently accepts up to ten minutes and 25 MB per input; the simple-file and Mix/Master alternatives retain the existing upload limits (100 MB audio/video/ZIP; 20 MB PDF; 10 files/250 MB total).
- Reference media remains private on a draft project. Publishing makes the chosen reference accessible with that project; submitted terms retain the exact reference for the participants.
- Private drafts are scoped to account and opportunity in SQLite; changing persona or logging out does not erase them. Sending clears the draft and follows the existing idempotent request operation.
- Gain controls change rendered PCM. Altering a gain or contribution clears the previous attached result, requiring another render before that result can be sent.
- This earlier pass did not generate footage; the subsequent polish pass used the explicitly approved Yapper generation (53 credits).
