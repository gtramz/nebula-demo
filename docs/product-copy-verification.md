# Product copy cleanup — 10 November 2026

This is a presentation-layer change in `nebula-demo`. No services, schemas, user records, media or financial history are changed. The presentation still contains simulations; removing explanatory product copy does not implement missing integrations.

## Copy inventory

| Surface / source | Treatment |
| --- | --- |
| Catalog player (`features/presentation/catalog.tsx`) | Remove “Silent demo preview”, “No audio included” and catalog instructions. Retain visual Play/Pause, seeking and duration; neutral accessible player names. No audio/media URL is added. |
| Catalog release cards and profile project grid | Remove “uploaded” badge. YouTube upload years retain a concise “YouTube” qualifier; they are not relabeled as verified release dates. Preserve real source links. |
| Imported project pitch/story (`features/presentation/product-copy.ts`) | Exact registered importer copy only, resolved by catalog artist/project. Remove demo opportunity suffix and redundant generated story; retain authored variants verbatim. No cache/data objects are mutated. |
| LUNA project copy | Exact registered presentation boilerplate becomes factual original/remix credits. Recordings, metadata and source relationship stay untouched. |
| Artist biographies | Suppress exact old gramz/CHILZ instructions; shorten the exact SANNFERNNA presentation bio. Preserve other biographies. |
| No Pop / No Regrets deliverable labels | Exact mapped song/project labels lose “Demo opportunity”. Requirements, compensation, revisions and submitted terms remain untouched. |
| Home and project detail | Render the scoped cleaned copy, preserving cards, search, filters and actions. |
| Discovery fallback | Remove demo badges and prototype paragraph; retain disabled actions, actual role/remix restrictions and temporary-comment lifetime notice. Live feed remains unchanged. |
| Share | Shorten local-link notice to “This link opens on this device only.” This is a necessary link limitation, not a claim of external delivery. |
| Profile cards | Remove repeated feature instructions beneath existing links. Keep every card and destination. |
| Public artist collaborations | Remove redundant explanation about private work and public credits. Keep empty state and owner access. |
| Registration | Remove repeated browser/server-specific paragraph. Keep form validation and account actions. |
| Onboarding/profile editor | Shorten optional setup and preference text. Preserve optional steps, privacy distinction and save/error feedback. |
| Home filters | Remove generic genre explanation; retain concise compensation/funding distinction. |
| Messages | Shorten empty states and introduction helper; remove repeated read-status instructions. Keep request acceptance, permissions, private conversation notice and actions. |
| Notifications | Remove page introduction/read-receipt explanation. Keep counts, read state, destination, errors and retry. |
| Publications | Shorten unused-file helper and remove duplicate draft explanation; retain deletion controls and remix permission distinction. |
| Collaboration | Remove generic stage descriptions and repeated system/payment explanations. Keep one payment-arrangement note, exact terms, acceptance consequences, file limits, privacy and conflict recovery. |
| Video Remix | Remove repeated stage descriptions. Shorten rebuild/render helpers; preserve required keep-tab-visible guidance and private save status. |
| Forge | Already has concise production-style copy. Keep integrated simulated journey and real receive/save/retry behavior; no fictitious transfer confirmations. |
| Pledges / Received | Shorten introduction to private contribution history. Keep totals, filters, privacy controls, receipts and removed-project states. |
| Unsupported environments | Replace server-implementation explanations with concise unavailable/try-later states. Never falsely enable unavailable actions. |
| More / mobile presentation shell | “Mobile view”; remove duplicate same-demo paragraph. Existing personas, reset and scenario controls remain confined to `/presentation`. Legacy browser-only clear action retains confirmation, renamed “Clear saved activity”. |

## Deliberate boundaries

- Do not scrub arbitrary user content, filenames, comments or messages containing words such as “demo”.
- Preserve contractual requirements, including the historical demonstration terms of No Pop/No Regrets. They are not converted into real commissions or royalty agreements.
- `/presentation`, source provenance, internal identifiers and Manuel's documentation retain accurate simulation information.
- Silent catalog transports remain visual only. LUNA and other real audio/video retain actual playback. Forge does not open a DAW or transfer files to Antiq Central.
- Actual errors, missing media, access restrictions, destructive confirmations and accessibility labels remain useful and visible when relevant.

## Preservation

Backup: `.data/backups/product-copy-20261110-201528` (active SQLite, initial SQLite, portable SQLite, previous frontend and media hashes). Tests run against an isolated temporary scenario on port 4177, never against live accounts on 4186.

Active, initial and portable SQLite data tables compared equal to the backup. Runtime session/rate-limit/feed-snapshot tables are excluded from content comparison. All 209 media, catalog and prepared-result files match their recorded hashes; none were added or removed.

## Verification results

**86 distinct desktop/mobile regression cases passed after updating obsolete text and navigation expectations.**

- Presentation regression set: 70 cases covering scoped copy rules, catalog, gramz, guided creation, guided collaboration/Forge/video workspaces, exclusive playback and return navigation. Initial run: 68 passed; the two obsolete “Silent demo preview” expectations were updated and passed on rerun.
- Additional shared-artist and mobile-view coverage: 10 cases. Verified new publications remain visible alongside catalog, song/project offers, owner permissions, profile tabs and return position, 390/768/1024/1440 layouts, iframe navigation safety and Mobile view. Two proposal-entry expectations were updated for the existing guided wizard and both passed; no product behavior was changed to accommodate them.
- Authentication persistence: 6 cases passed, covering closed tabs, restored sessions, logout, clearing activity, concurrent registrations, activity synchronization, identity separation and legacy migration. Tests now follow the existing authenticated Home redirect and open Account activity before inspecting it.
- Artist, Investor and visitor states exercised; real saved-list error/retry and login restriction checked.
- TypeScript: `tsc --noEmit -p artifacts/nebula/tsconfig.json` passed.
- Production build: `vite build --config artifacts/nebula/vite.config.ts` passed. Existing sourcemap and large-chunk warnings remain; this copy-only change does not address bundle optimization.
- `git diff --check` passed.

Test commands use `playwright.presentation.config.ts` for `product-copy`, `catalog`, `gramz`, `guided-creation`, `guided-workspaces`, `discovery-playback`, `return-navigation`, `shared-artist` and `mobile-preview`; authentication uses the existing main Playwright configuration. Tests run on temporary data, not the presentation account.

The compiled frontend is active at http://127.0.0.1:4186. HTTP 200 and served asset `/assets/index-D8R1StjU.js` were verified against the built file. The previous frontend is backed up. No server/schema update was needed. No outstanding failure remains in the executed cases; this is focused copy/regression verification rather than a new comprehensive audit.

## Representative screenshots

- [Home — desktop](images/product-copy/home-desktop.png)
- [Home — mobile](images/product-copy/home-mobile.png)
- [Catalog player — desktop](images/product-copy/catalog-desktop.png)
- [Catalog player — mobile](images/product-copy/catalog-mobile.png)

Catalog captures show the retained visual player and authentic Spotify link. Home captures show concise titles and unchanged USD/royalty terms. Simulated catalog playback remains documented here and in Manuel’s handoff.
