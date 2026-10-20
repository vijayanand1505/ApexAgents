# SquadLings — One squad. Many minds.

> Copied from [amarnath3003/SquadLings](https://github.com/amarnath3003/SquadLings) at `cd568c5`. Paths such as `dashboard/` and `packages/shared/` refer to that repository's layout; the matching code here is in `web/src/` and `web/shared/`.

A 52-second, 16:9 launch film with restrained synthesized sound effects. Sample task: “Plan a weekend in Kochi for our team.” The work/result scenes are labeled “Simulated workflow”; findings are illustrative. No live browsing or booking is claimed.

## Visual direction

Use black negative space, large white typography, bold changes of scale, a browser close-up and a continuous camera pullback, and purposeful pauses. The user requested an Apple-style introduction and identified the first 15 seconds of [OpenAI DevDay 2026](https://www.youtube.com/watch?v=Fls_onRviPM) as the motion reference. Codex inspected video frames through 15 seconds in Chrome: oversized face → small centered circle with changing glyphs → dispersed dots → title. Our cold open and transitions use that visual rhythm with original paths and the project's own SVG characters. No video frames, audio, OpenAI logo, or third-party footage are included in the deliverable.

| Time | Picture and action | Sound / purpose |
| --- | --- | --- |
| 00–02.6 | An enormous face fills the screen. Quick color/expression changes; a rapid pullback leaves a small circle centered in black. | Two short wake/boop notes. Establish personality through scale. |
| 02.6–06 | “One task.” The request types inside a simplified pill: plus, task, small agent dots/count, circular send arrow. | Sparse typing taps. |
| 06–10 | “Your squad.” The existing selector introduces the five agents with its original arrival/greeting motion. Taller, correctly aligned flames rise above the full squad. | Five ascending join notes and launch cue. |
| 10–14 | The accepted circle launch crosses, scatters, expands, and resolves through one black cover. | Launch/spark notes. |
| 14–19.2 | Start inside Plum’s new browser page, watching the native reading animation over its content. The camera smoothly pulls back to all five independent browser pages. | Planning note; room to watch the character. |
| 19.2–31 | Agents read, scroll, type, discover, and complete tasks inside their pages. Small colored charms drift through open space between them and Onyx. Onyx sends Lime a rainy-day follow-up; contributions and completions arrive at different times. | Sparse dispatch/report and completion cues. No visible connection lines. |
| 31–36 | Browser pages recede while the same agents float into a waiting row. Onyx inspects the contributions with a moving magnifier, checks all five individually, then assembles the report. | Five review ticks followed by a merge cue. |
| 36–37.6 | A report leaves Onyx, travels toward the viewer, and opens into the two-day itinerary. | Quiet delivery/completion chord. |
| 37.6–42 | “Consider it done.” Hold the reviewed report long enough to read; the squad waits below. | Quiet reading time. |
| 42–47 | The report recedes. The same agents glide along staggered arcs into their resting places, with Onyx joining from above as the wordmark appears. Each has a distinct face: white carets, purple side-eye, green pluses, orange equals, blue chevrons, pale-blue circles. | Descending return notes. No second swarm or black transition. |
| 47–52 | Onyx and the agents close their eyes one by one and breathe with floating “zzz.” The brand holds. | Gentle sleep notes, then a silent tail. |

A [nine-frame storyboard preview](storyboard-preview.jpg) is extracted from the finished MP4.

## Existing elements reused

- `SquadSlider` / `SquadFire`: arrivals, growing stack, count, full-squad fire.
- `BotCharacter` / `useBotActor`: reading, scrolling, typing, discovery, output, victory, breathing, and sleep.
- `MasterCharacter`: Onyx's planning, monitoring, receiving, merging, and done reactions; an optional resting pose was added.
- Shared cast palette and SVG facial glyphs.
- Existing Web Audio effect recipes; no external music or voices.

New work: timeline, original browser-page illustrations/content, continuous camera and character choreography, floating dispatch/report charms, sequential review and report delivery, playback controls, soundtrack assembly, and Chrome/FFmpeg recording. The browser pages are scripted HTML compositions based on the dashboard layout; they are not recordings of live websites. The selector reuses its native motion unchanged; the shared fire renderer now measures in local CSS coordinates, with larger plumes scoped to the film.

## Playback and recording

Run `npm run dev`, then open **http://127.0.0.1:5173/film** and choose **Play film**. Sound is enabled by that click and can be switched off. The film starts paused, including under reduced-motion preferences. Scrubbing or Pause stops story progression; character ambient animation remains live. **Restart** resets the story. `?capture` hides controls; `?t=25` previews a timestamp. The fixed 16:9 stage letterboxes to fit smaller windows.

With Node 22.12+ and FFmpeg (H.264/AAC support) available:

```sh
npm run build
npm run preview                   # Leave this running on port 4173
# In a second terminal, from the repository root:
FILM_URL=http://127.0.0.1:4173 npm run film:record
```

Default output: `dashboard/artifacts/video/squadlings-film.mp4`. To select the deliverable location:

```sh
FILM_URL=http://127.0.0.1:4173 \
FILM_OUTPUT="$PWD/docs/video/apexagents-intro.mp4" \
npm run film:record
```

Set `FFMPEG_PATH` to a full executable path if FFmpeg is not on PATH. Chrome is selected automatically on macOS when installed; otherwise install Playwright Chromium with `npx playwright install chromium`, or supply `PLAYWRIGHT_CHANNEL`. The recorder advances the browser clock in fixed 1/30-second steps, samples CSS/Web Animations at that virtual time, and captures every output frame. It renders the existing audio effects offline and muxes an H.264/AAC MP4. Export takes longer than playback; it does not rely on real-time capture performance. Ambient pseudo-random motion can vary across exports, so the file is not claimed to be bit-for-bit reproducible. The recording report and WAV remain in ignored `dashboard/artifacts/video/`.

On this macOS 12 machine, Playwright's bundled FFmpeg installer is unsupported. A local, ignored `imageio-ffmpeg` wheel supplied FFmpeg 7.1 for the export. To reproduce that optional tool setup:

```sh
python3 -m pip install --target dashboard/artifacts/video-tools imageio-ffmpeg==0.6.0
PYTHONPATH=dashboard/artifacts/video-tools python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'
# Use the printed path as FFMPEG_PATH in the recording command.
```

Sources: existing [Playwright](https://playwright.dev/), [FFmpeg](https://ffmpeg.org/), and optional [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg). No npm dependency was added for the film.

Checks: `npm run build`, `npm test`, and `npm run test:browser --workspace dashboard -- film.spec.ts`. Human pacing/listening review remains pending; see the changelog for export verification.

## Verified export

On 11 October 2026 (IST), the corrected **SquadLings** production capture recorded all **1,560 frames**, producing **52 seconds at 1920 × 1080 / 30 fps**, H.264 video and 48 kHz mono AAC sound, with zero Chrome page errors. FFmpeg decoded the complete file and measured an audio peak of −25.5 dBFS. Near-black detection identified the intentionally tiny-circle opening (1.20–2.33 s) and launch cover (12.80–13.67 s), with no dark interval during the return/sleep sequence. The exported contact sheet and full-resolution corrected ending were visually inspected.

The user approved the revised animation before requesting the brand-name correction; that correction keeps the same scenes/timing. Human review of the final renamed export and listening remains pending. The banner is separately saved as [apexagents-github-banner.png](../assets/apexagents-github-banner.png); its edit prompt is recorded [here](../reference/apexagents-banner-prompt.md).

File: `apexagents-intro.mp4` — 5,307,799 bytes. SHA-256:

```text
0462aed596b78ba7647f50ec368e380389a1cfb6aaddff5bb63e6d54ba9a383a
```


## ApexAgents render — 20 October 2026

Re-rendered the existing saved character-studio bundle with the ApexAgents wordmark using system Chrome, Playwright's virtual clock and FFmpeg. Captured all 1,560 frames at 1920 × 1080 / 30 fps and retained the existing synthesized soundtrack. Updated both distributed MP4 copies, the README GIF and storyboard contact sheet. This used the local archived `dashboard/dist` bundle; the original film source is not part of this repository. The October 11 capture measurements above describe the previous export.

Current MP4: 5,126,606 bytes; SHA-256 `c6eca8107b7eebb3ad177d9a229392396275e256b3833381622347fa0bb152c3`.

## Synchronized cast export — 20 October 2026

The previous export's agent-selection scene could show the counter advancing ahead of the visible introductions. The revised recorder advances the browser clock as well as the scene timeline and explicitly samples each arrival on that same timeline. Plus presses, counts and the original join sounds remain 480 ms apart; each new character appears immediately and settles over 180 ms. Five fixed, named seats prevent the existing characters from shifting when the next one arrives. The pointer follows the actual plus/send controls, and the full squad remains visible until the launch begins at 10 seconds. Added restrained button presses, arrival motion, empty-seat outlines and smaller individual flames.

Re-export using the existing local studio archive (not included in a fresh clone), installed Chrome, Node 24 and FFmpeg:

```sh
FFMPEG_PATH=/path/to/ffmpeg npm run film:render
```

Optional `FILM_STUDIO_DIST` selects the archived studio build directory; `FILM_OUTPUT` selects the output MP4. Defaults are `dashboard/dist` and `spikes/out/film-render/apexagents-intro.mp4`. The recorder checks the expected archived timeline before applying its film-only changes, captures 1,560 frames, writes six cast/count checkpoints plus a recording report, and copies the existing distributed MP4's AAC track. Keep the distributed input MP4 present during export. The resulting video uses H.264/yuv420p with a fast-start index; the complete existing 52-second story and soundtrack are retained.

The website viewer now includes an extracted poster, a compact header and an in-frame close button that stays accessible on short landscape viewports. Both distributed MP4s, the README GIF and the storyboard preview were updated together. Current MP4: **4,626,707 bytes**; SHA-256 **`0b673791e7b872ab2f7232a7ecd897338714d25aa128d39d25066ddb7fa9329b`**. Full FFmpeg decode and all six render checkpoints passed; the AAC bitstream matches the previous export. Human pacing/listening review remains pending.
