# Discovery audio cards — 2026-11-11

The shared audio card now displays a fixed, tilted sleeve and a textured record. Existing publications, independent uploads and remixes use the same component; video cards retain their existing composition. The artist appears under the title. Detalles opens the existing description panel, including original credits for remixes. Original and comparison links remain on the card.

The cover supplies two colors to a static full-card background. Sampling uses a 32×32 canvas after the displayed image loads, with a bounded 64-entry cache; missing or failed artwork leaves a dark background. Artwork can be retried independently. No image assets, API, schema, migration or playback ownership changed.

The record makes one clockwise revolution every six seconds. CSS animation-play-state freezes its current angle; the existing audio's playing/pause/waiting/error events and active/blocked state control it. Pausing, buffering, leaving the piece and page visibility pause stop it; muting does not. Reduced motion removes rotation. There is no second audio element or playback timer.

The waveform uses real server peaks, aggregated by peak for display, with a lime played region, gray remaining region, playhead and visible elapsed/total time. If peaks cannot load, the original seekable timeline remains. Seek, volume, likes, comments, project and Details controls are outside the artwork tap target. Responsive rules shrink artwork before controls; mobile comments preserve the existing compact player and pause policy.

## Preservation

Started from clean commit `10c5e79f592b4e8885b7cc75c7c51aa369a790ce`. Local backup/evidence: `.data/audio-redesign/before.sqlite`, `before-hashes.json`, `luna-before.json`. The live database was never reset; tests use the temporary copy created by `scripts/test-presentation-server.mjs`.

| Protected item | SHA-256 before and after |
| --- | --- |
| Luna original cover | `1bb5836b0e348d936a3532c48dc300f602104fe01414488305f9517719c34c8c` |
| Luna CHILZ Remix cover | `a22fd31bb33bd30a56e2d873cf98ab3d4ef3f0eb84e0cae3e0cd5043378949c3` |

Full post rows 17 and 18, including owner, media, cover, work and project associations, compare equal. The seed manifest, feed scroll implementation, like component/styles and desktop comments component also match their initial hashes. The 27 live publications remain present. Both local origins serve the rebuilt client over the existing data directory.

## Validation

- `pnpm build`: passed, including TypeScript project checks, UI build and server compilation. Vite still reports the existing large bundle advisory.
- Final combined result across the selected cases: **36 passed, 6 platform skips, 2 confirmed pre-existing video failures**. The full repository browser suite was not run or declared green.
- Testing is local Chrome automation, including an emulated iPhone viewport, not a physical iOS device. Buffering and visibility handlers are exercised by dispatching their events; recovery tests intercept actual cover/media/waveform requests. The rotation tests inspect the browser's animation clock and computed transform across real play/pause and seek.

The first development run exposed early palette sampling timing out while initial media requests were loading (5 passed, 2 failed, 5 not run). Sampling now starts after the visible cover loads. This was fixed before the final run. Historical desktop tests that still request the removed “Resume playback” button are excluded, not reported as passing; the new suite covers the current artwork button and keyboard volume interaction.

## Local preview

- Desktop: http://127.0.0.1:4187/discovery
- Mobile frame: http://localhost:4188/presentation/mobile

No seed preparation/reset, production deployment or remote push was performed.

## Results matrix

| Coverage | Result |
| --- | --- |
| Low Tide, Luna, CHILZ Remix at 375/390/430 and 1280/1440; comments, source identity, per-cover palette | Passed, both platforms |
| Record rotation, frozen angle, resume, seek, mute, buffering, visibility and navigation with one playing medium | Passed, both platforms |
| New independent upload, long title, missing cover, failed waveform, Details | Passed, both platforms |
| Failed cover/media and independent retry | Passed, both platforms |
| Reduced motion with audio still progressing | Passed, both platforms |
| Short horizontal layout, action bounds and open comments | Passed, both platforms; repeated after final CSS adjustment |
| Like request success/slow/failure, duplicate protection, keyboard, guest, reduced motion and scroll cancellation | 12 passed |
| Tap/pause, comments, seek and feed scroll regressions | 10 passed, 2 platform skips |
| Audio volume hover/drag/mute at 1440 and 768 with comments; desktop touch volume | 2 passed |
| Video volume hover at 768 with comments, posts 11 and 14 | 2 pre-existing failures, reproduced on the initial commit |

The main 44-case run produced 34 passes, 6 platform skips and four volume test failures. Those tests called `media.pause()` directly instead of the user's pause control; their setup now uses the real artwork/video tap button. The final targeted rerun produced 4 passes (audio volume, touch volume, both landscape cases), 4 platform skips and the two video failures below. Accounting for repeated landscape cases yields the combined result above.

### Confirmed pre-existing video limitation

For both video posts 11 and 14, at 768×930 with comments open, hovering volume shifts its button from x=339.34375 to x=324.34375. The unchanged video layout fails the no-movement assertion. An isolated UI export from `10c5e79f592b4e8885b7cc75c7c51aa369a790ce`, with the same corrected test setup and disposable data, reproduces **exactly the same two failures and coordinates**. Videos were deliberately kept outside the redesign. Baseline files and temporary server configuration are in `.data/audio-redesign/baseline*`; the live UI was not swapped for the baseline.

Visual review also found the previous short-height two-column action rail lacked its required width. The final audio-only rule reserves that width and keeps the volume tray inside narrow comment layouts. This is covered by the final landscape bounds test and the passing 768 px audio volume test.

### Commands and logs

- Main selection: `pnpm exec playwright test --config playwright.presentation.config.ts tests-presentation/discovery-audio-record.spec.ts tests-presentation/discovery-tap.spec.ts tests-presentation/discovery-scroll-regression.spec.ts tests-presentation/discovery-like.spec.ts tests-presentation/discovery-desktop.spec.ts --grep 'audio covers|record follows|new independent audio|failed artwork|reduced motion leaves|landscape keeps|desktop volume [0-9]|desktop touch volume|tap|scroll|like' --reporter=line`
- Follow-up: `pnpm exec playwright test --config playwright.presentation.config.ts tests-presentation/discovery-audio-record.spec.ts tests-presentation/discovery-desktop.spec.ts --grep 'landscape keeps|desktop volume [0-9]|desktop touch volume' --output test-results-audio-volume --reporter=line`
- Baseline: `pnpm exec playwright test --config .data/audio-redesign/baseline.config.ts tests-presentation/discovery-desktop.spec.ts --project desktop --grep 'desktop volume (11|14)' --reporter=line`

Logs: [build/types](build.txt), [main run](browser-primary.txt), [final targeted run](browser-followup.txt), [initial-code comparison](browser-baseline.txt).

## Captures

| View | Capture |
| --- | --- |
| Mobile 375, Low Tide | [375 px](screenshots/mobile-audio-3-375.png) |
| Mobile 390, Luna | [390 px](screenshots/mobile-audio-17-390.png) |
| Mobile 430, CHILZ Remix | [430 px](screenshots/mobile-audio-18-430.png) |
| Desktop 1280, Low Tide | [1280 px](screenshots/desktop-audio-3-1280.png) |
| Desktop 1440, CHILZ Remix | [1440 px](screenshots/desktop-audio-18-1440.png) |
| Comments | [Mobile](screenshots/mobile-audio-18-comments.png), [desktop](screenshots/desktop-audio-17-comments.png) |
| Horizontal | [Mobile](screenshots/mobile-audio-landscape.png), [desktop](screenshots/desktop-audio-landscape.png) |
| Horizontal with comments | [Mobile](screenshots/mobile-audio-landscape-comments.png), [desktop](screenshots/desktop-audio-landscape-comments.png) |
| New upload, no cover/waveform | [Mobile](screenshots/mobile-independent-no-cover.png), [desktop](screenshots/desktop-independent-no-cover.png) |

Additional captures for all three songs at every requested width remain in `test-results-presentation/`. Headless Chrome captures use the mobile device's pixel ratio; filenames state CSS viewport widths.
