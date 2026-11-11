# Demo handoff inventories

Reference: b9cbf60 plus Luis's local Luna artwork, tap playback and feed-scroll changes. Desktop delivery; the existing mobile tap/scroll checks remain required regression protection.

## Loading inventory

| Surface | Initial readiness / skeleton | Refresh, pagination, failure |
|---|---|---|
| Landing/auth | Existing auth landing skeleton; local font assets | Compact validation/pending states; no artificial intro |
| Explore/Home | Existing opportunity cards gate image/avatar/player/font readiness; project card grid skeleton | Retain loaded grid on refresh failure; retry notice; existing cursor/empty behavior |
| Artist | Profile skeleton; bounded initial avatar and first-cover decoding + font readiness | Retain profile and selected media during polling; retry notice; publication pagination stays incremental |
| Project | Project skeleton; initial cover/avatar/font readiness | Keep detail on refresh failure; retain availability/permission checks and retry |
| Profile/identity | Account/form skeletons; profile preferences must load before editing | Existing draft identity keys preserved; recoverable preferences/save errors |
| Messages | List and conversation skeletons occupy separate panes | Polling does not replace the composer or transcript; older messages remain merged by ID; empty/request/error states retained |
| Received/Pledges | Compact metrics/list skeleton for Received; list skeleton for pledges | Preserve ledger totals/history and loaded records on refresh failure; retry and filter-specific empty state |
| Receipt | Receipt skeleton | Distinguish failure/retry from missing receipt |
| Search | Existing result-section skeletons and debounced cancellable queries | Empty/whitespace query has an empty live status; short query, failures, results and no-results remain distinct |
| Saved | Compact artwork/player/action skeleton; initial covers/font readiness | Failed unsave preserves item; successful unsave updates cache and invalidates Saved, publication, Discovery and Home queries only; pagination retains previous items and adds collection-shaped skeletons; missing artwork has a fixed-size fallback; offscreen players pause |
| Discovery | Canonical face, no dots; existing 5000 ms minimum and media/cover/waveform readiness | Existing asset fallback, buffering/error/retry, incremental feed and retained snapshot preserved; ambient sampling never gates the feed |
| Notifications | Compact list skeleton inside anchored window | Server-side unread cursor; retry, mark-one/mark-all, empty state; single summary polling owner |
| Publications | Existing list and editor skeletons | Failed editor load has retry; cached editor stays mounted; upload progress/cancel and media errors remain inline |
| Remix/Forge/proposals | Existing workspace/form, waveform and media readiness | Pending real work, cancellation, invalidation, private draft recovery; custom audio reports playable/error separately from metadata |
| Songs/Offers | Existing list/form/reference readiness | Song editing preserves loaded data on refresh failure; revisions, separate save and reference upload pending states retained |

Initial asset preparation waits for completion, never for a fixed display delay. Asset/font failures are bounded at 2500 ms; the existing Discovery intro remains the only intentional minimum wait. Previously revealed route keys and image promises have bounded caches. Geometry remains allocated during image loading.

## Form field mapping

| Family | Fields and destination | Presentation / operation boundary |
|---|---|---|
| Publication create/edit | Media: audio/video; Details: title, description, optional cover/removal; Project: project, optional song, remix permission; Review: current summary | Four existing stages; shared morph for Continue and Publish/Save changes; Save & exit preserves draft/published semantics; existing publication API/revision contract plus an optional operationId for exact retries |
| Project create/edit | Identity: title/category/cover; Songs & story: pitch/story/new ordered songs; Opportunities: seeking toggle, project/song scope, need, deliverable, requirements, compensation, deadline, status, reference; Review: funding toggle/goal/use-of-funds/status | Existing payloads and category rules preserved. Canonical feedback and current-step/final validation. Existing project songs and offers remain independent save operations, outside the project form; edits do not silently save them |
| Artist identity edit | Identity: name/picture/bio; Creative profile: creativeRoles/genreIds and legacy values; Public details: basedIn/recordLabel/availability/interests/externalLinks; Preferences: collaboration and discovery groups; Review | One five-stage flow; existing changed-field mapping and expected revision object retained; failed save keeps all values |
| Artist onboarding | Identity; creative identity; interests/preferences; profile completion | Existing canonical MorphAdvanceButton flow retained, including skip, save/exit and completion semantics |
| Song list | Songs: new/existing work IDs, revisions, titles, descriptions, order, removals; Review: ordered titles and descriptions | Two inline stages; reference-protected removals, operation ID and tracklist revision unchanged; Save songs remains separate from project details |
| Collaboration request/proposal/delivery | Opportunity terms; contribution method/reference/take/files/remix; playable preview; introduction (request only), proposal/delivery notes, term acknowledgement | One guided sequence, retaining all payloads, upload bounds, prepared-result IDs, operation IDs and revision checks. Sending awaits the real operation before completion feedback. Existing local drafts remain scoped to participant and thread |
| Private Remix/video | Fragment start/end; method/contribution; gains/framing/render; title/description/review/save | Existing four stages and settings retained. Shared Continue/final-save feedback; source and render readiness unchanged; no duplicate audio preview |
| Forge | Original; prepared workspace; original/version comparison; title/description/save | Existing demo simulation and prepared render preserved. Async receive/save completion drives feedback; cancellation remains available |
| Registration | Role; name; email; password/confirmation | Existing three field stages plus role selection. Shared guarded morph; account creation completes before redirect; no new credential storage |
| Login | Email/password | Compact single-action form retained; existing pending/error state. A wizard would add no useful decision |
| General message request | Introduction plus optional project context | Compact single-action form retained; existing operation-ID retry and pending/error feedback |
| DM/comments | Message/comment text, reply target where applicable | Compact inline composers retained; keyboard typing never triggers media shortcuts |
| Contributions/visibility | Amount and applicable visibility choices; funding/visibility settings | Compact contextual forms retained, including real validation and historical receipt behavior |
| Search/filter/follow/save/media/recording controls | Existing query, filter, relationship, playback, capture/discard parameters | Inline controls remain inline; no added steps or writes |

## Protected state

- Immutable checks: both Luna PNGs, seed manifest, seed SQLite and feed-scroll.ts match `.data/handoff-before-20261111/protected-hashes.json`.
- Discovery player changes are limited to decorative background insertion. Existing tap hit area, Play icon, comments/transport boundaries and manual pause behavior remain intact.
- The runtime database was backed up through SQLite's backup API. Tests start disposable fixture servers, never reset the user's running demo.
- Query-driven project intents distinguish fresh editor instances; ordinary renders and step changes retain the same draft.
