# Discovery project overview

The Discovery “View project” action now opens a compact overview using the Share dialog shell: centered on desktop, a bottom sheet on mobile, rounded corners, content-driven height capped at 88dvh. The body scrolls when necessary while “View full project” remains in the footer.

The overview shows the project's own artwork (with a neutral fallback), title, artist, status and up to four lines of description. Available opportunities appear as a count and the first three needs, with a remainder count. Funding, spending breakdowns and collaboration forms are available in the full project instead of this overview.

The full-project link retains `/project/:id?song=:workId` when a song is present. Independent publications and publications without a public project do not gain a project destination. Data comes from the existing Discovery DTO; opening the overview adds no project API queries. No API/schema/storage changes.

## Preservation

Base commit: `ccd8248737636f2b1ec02230fadf518f9c3d69c5`. The working tree was clean before implementation. A consistent local database backup, protected hashes and Luna publication rows are stored in `.data/project-preview/`.

Share's shell selectors were extended to include the project variant; its content, actions and original dimensions are unchanged. The existing dialog owns focus trapping, Escape/outside dismissal, focus return and playback blocking. Closing retains a manual pause or resumes playback that was active before opening.

The two tests that locate the full-project link now use its agreed label “View full project”. The Share test now pauses through the real video tap control before checking manual-pause preservation, rather than calling `media.pause()` directly.

## Verification

**22 passed, 2 platform skips; no failures** in the selected 24-case run (4.7 minutes). The 8 new overview cases and all 4 Share cases passed. The 2 skips are the existing touch-swipe case on desktop and trackpad-tail case on mobile.

- `pnpm build` includes the project TypeScript checks, UI build and server compilation. The existing Vite large-bundle advisory remains.
- Browser checks run on a disposable database copied by `scripts/test-presentation-server.mjs`; the live demo is never reset. Mobile is Chrome device emulation, not a physical iPhone.
- New coverage: public audio/video/remix, project artwork and metadata, zero/multiple opportunities, up to three needs, absent/failed cover, long title/description, footer hit-testing on short screens, no public project, no extra project queries, full-project navigation, focus return, manual pause and same-player preservation.
- Viewports: 375×667, 390×844, 430×932, 1280×720, 1440×900; short screens at 667×375 and 1280×440.
- Existing Share tests cover sends, partial failure/retry without duplication, requests/chats, avatars, search, clipboard fallback, external links, focus and identity isolation. Existing tap/comments and scroll regression suites are also included.

Command:

```sh
pnpm exec playwright test --config playwright.presentation.config.ts tests-presentation/discovery-project-preview.spec.ts tests-presentation/discovery-share.spec.ts tests-presentation/discovery-tap.spec.ts tests-presentation/discovery-scroll-regression.spec.ts --output test-results-project-preview --reporter=line
```

The full repository browser suite is outside this targeted run. The previously documented video-volume layout failures at 768 px are outside this change and are not claimed as fixed.

## Local preview

- Desktop: http://127.0.0.1:4187/discovery
- Mobile: http://localhost:4188/presentation/mobile

Both origins serve the rebuilt client over the existing demo data. No remote deployment or push.

Protected verification: all **10** pre/post file hashes match, including both Luna covers, seed associations, media player, vinyl CSS, likes, comments, feed scroll and Share logic. Full stored post rows 17 and 18 match. The live demo still contains **27 publications**. Both localhost origins returned HTTP 200 with the rebuilt overview bundle.

Logs: [build and types](build.txt), [browser results](browser.txt). Protected hashes: [before/after reference](protected-hashes.json).

## Captures

| Scenario | Capture |
| --- | --- |
| Desktop 1280, audio | [Low Tide](screenshots/desktop-project-3-1280.png) |
| Desktop 1440, video and opportunities | [Marea Alta](screenshots/desktop-project-11-1440.png) |
| Desktop remix | [CHILZ Remix](screenshots/desktop-project-18-1440.png) |
| Mobile 375, audio | [Low Tide](screenshots/mobile-project-3-375.png) |
| Mobile 390, video and opportunities | [Marea Alta](screenshots/mobile-project-11-390.png) |
| Mobile 430, remix | [CHILZ Remix](screenshots/mobile-project-18-430.png) |
| Short screen, long content, placeholder and five opportunities | [Desktop](screenshots/desktop-project-short-long-content.png), [mobile](screenshots/mobile-project-short-long-content.png) |

Capture checks are repeated with screenshot animations disabled to record the completed opening transition rather than a partially transparent animation frame. This affects screenshots only; the app retains Share's existing opening animation.

Final capture rerun: **4 passed** (1.2 minutes), repeating the layout/content cases with completed animation frames. [Capture check log](captures.txt).
