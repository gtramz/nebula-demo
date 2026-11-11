# Guided Collaboration and Remix — implementation notes

Scope: `nebula-demo`, 10 November 2026. Existing routes, media engines, private workspaces and submission services remain in use. The inbox and owner review keep their existing layout.

## Artist journeys

| Journey | Stages | Real outcome |
| --- | --- | --- |
| New collaboration | The opportunity → Your contribution → Preview your work → Review & send | A private draft, or a real request and its conversation after confirmation |
| Audio original / Forge demo | Choose your original → Remix with Forge → Review your version → Keep working or propose | A locally mixed, playable private Remix draft; eligible project proposal entry |
| Nebula editor | Choose the fragment → Your contribution → Framing & mix (or Shape your mix for audio) → Review & save | Existing audio/video output and editable private draft |

`/messages/offer/:id` presents the opportunity, real reference/download when available, take recording/upload, compatible prepared takes, fragment/framing/levels, comparison, additional attachments and current terms. Mix/Master and references without media accept finished work without an obligatory overlay mix. The existing `/remix/:id` entry and private draft routes are preserved.

A shared context card carries cover, artist and song/project; collaboration adds need and compensation. Four progress controls, Back, Continue and Save & exit guide the workspace. Stages remain mounted but hidden, so editing does not destroy recorders, selected files or text. Changing stages pauses media. Active recording/render/upload/save blocks stage changes; cancellation stays available. Mobile actions sit above the existing navigation and safe area, with content padding to keep fields reachable. No new navigation or profile redesign.

## Forge: simulation vs working features

- **Simulated:** transfer from Nebula to Forge and return. The panel explicitly says `Forge workflow · Demo`; no files, credentials or account context are sent outside Nebula.
- **Working:** original/fragment selection, audio recording/upload, the existing local mix engine, playback/comparison, private save/reopen and proposal navigation.
- **Visit Forge:** opens only `https://antiq.xyz/downloads/forge/` in another tab. No native protocol, SSO, SDK, native project import or Antiq Central connection is claimed.
- New audio drafts highlight Forge; `Use Nebula editor` and `Create a video remix` remain available. Video originals require video. Existing drafts keep their compatible route and files.
- Prepared samples appear only when they belong to that original and match the route. Current presentation pairs supply video takes, so Forge audio uses an uploaded or recorded contribution, not an unrelated example.
- Forge's page could not be retrieved through the research tool during this delivery; no unverified Forge tools, presets or capabilities were added.

Connecting the ecosystem later requires an agreed authorization and handoff contract, media permissions, native application launch/return behavior, attribution/revision semantics and real error handling. None is simulated as a successful server operation here.

## State and compatibility

`components/guided/journey.tsx` stores **only** step and method under `nebula-journey-v1:` in session storage, keyed by identity and draft/opportunity. Memory is the fallback when storage is blocked. Logout clears this UI state; account-specific keys prevent cross-account restoration. On reopening, prerequisite checks clamp the visible stage to available media and playable results. State from unfinished local edits is not represented as a saved server draft.

Existing file and draft persistence remains authoritative. `Save & exit` awaits the real save before leaving. It does not submit a collaboration or start a new conversation. A save failure retains work and shows the error. Remix retains optimistic revision conflicts and source-permission checks; proposals retain current offer revisions, acknowledgements, duplicate-operation handling and private media access.

An additive optional `preparation.resultId` is stored in the existing proposal-draft JSON. A UUID identifies the actual output; explicit `null` means the output was invalidated. The server requires a non-null ID to be an attached audio/video file owned by the applicant. This prevents an unrelated additional audio attachment being mistaken for a valid mix after reopening. Legacy drafts without the field keep their previous compatibility behavior; no automatic rewrites, new endpoints, tables or migrations are used. This reference identifies the selected result; it is not audiovisual verification.

Saved proposal JSON also preserves optional `remixDraftId` / legacy `publicationId`. Saving a Remix-backed proposal reuses the actual submission media checks: only its verified final output may be attached, raw private tracks remain prohibited, and no thread or recipient permission is created. Reopening restores the source reference and attribution.

Changing a contribution, fragment, levels or framing invalidates dependent output while retaining introduction, description and unrelated attachments. Existing Remix draft settings and composition contracts remain unchanged.

## Files in this delivery

- `artifacts/nebula/src/components/guided/journey.tsx` and `journey.css`: shared guided shell, focus, responsive actions and session UI state.
- `artifacts/nebula/src/features/collaborations/index.tsx`: new-offer stage integration, save/exit, submission gates and result restoration.
- `artifacts/nebula/src/features/collaborations/proposal-preparation.tsx`: staged reference, recording, preview and complete-delivery paths.
- `artifacts/nebula/src/features/collaborations/contribution-recorder.tsx`: permitted recording formats, reused by Remix.
- `artifacts/nebula/src/features/remix/studio.tsx`: guided methods, Forge demonstration and shared capture controller.
- `server/collaborations.ts`: optional validated result and Remix references in existing draft JSON.
- `tests-presentation/guided-workspaces.spec.ts`: new end-to-end coverage; `collaboration-preparation.spec.ts` and `closing.spec.ts` updated to traverse stages without dropping underlying media/privacy assertions.
- `server/proposal-preparation.test.mjs` and `server/app.test.mjs`: output restoration and private Remix proposal-draft authorization.

## Verification and activation

Results and screenshots are recorded in the accompanying Manuel handoff, section 23. Browser fixtures run on a temporary database and media copy at port 4177, never by resetting the rehearsal at 4186. Camera/microphone tests use Chromium fake devices, plus denied and delayed-permission cases. Mobile checks use Chromium emulation, not a physical iPhone or Android device.

The pre-change backup is `.data/backups/guided-20261110-173544/`, containing both SQLite databases and all 74 media/prepared files. `.data/guided-preservation.json` compares table contents and SHA256 hashes. `feed_snapshots` is operational/expiring state and may change during normal feed use; it is reported separately from account/content preservation.

Final result: 28 distinct browser cases passed across the selected closing, collaboration-preparation and guided suites; 39 API cases and 81 unit cases passed. TypeScript and production build passed. Four final visual regressions and two explicit primary-action viewport checks also passed. Checks cover 390/768/1024/1440 widths and a 600px-height viewport. Existing bundle-size warning remains; physical device and real screen-reader verification are still pending.

Activated at localhost:4186 without reset. Post-restart comparison: 32 live tables unchanged, only operational `feed_snapshots` expired; all 31 initial-snapshot tables unchanged; all 74 media hashes identical. Screenshots and Spanish integration notes are in Manuel's handoff section 23.
