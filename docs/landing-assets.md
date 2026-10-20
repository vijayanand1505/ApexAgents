# Landing page assets

The landing page is implemented in `web/src/landing/` using React, Motion and the project’s native SVG character components. Its color palette follows the existing shared cast. No stock imagery, external analytics or new runtime dependencies were added.

- **Characters:** existing `web/src/characters/BotCharacter.tsx`, `MasterCharacter.tsx` and `web/shared/cast.ts`, created for ApexAgents during the event.
- **Launch film:** `web/public/media/apexagents-intro.mp4` matches the project’s `docs/video/apexagents-intro.mp4`. The revised export synchronizes the cast's arrivals and selection cues and uses a spaced, labeled cast row. Its poster is a frame extracted from the project film; video loads when its dialog opens. The existing synthesized soundtrack is retained. Production notes: [storyboard](video/storyboard.md); recorder: `scripts/render-launch-film.ts`.
- **Bricolage Grotesque:** variable Latin WOFF2 from [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque); [upstream font and license](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque). The SIL Open Font License is distributed beside the font in `web/public/fonts/bricolage-grotesque-OFL.txt`.
- **DM Sans:** variable Latin WOFF2 from [Google Fonts](https://fonts.google.com/specimen/DM+Sans); [upstream font and license](https://github.com/google/fonts/tree/main/ofl/dmsans). The SIL Open Font License is distributed beside the font in `web/public/fonts/dm-sans-OFL.txt`.

Fonts are served locally, so page loads do not contact Google Fonts. Decorative routes, browser illustrations, icons and stickers are native HTML/CSS/SVG. The Onyx workflow uses the existing `useBotActor` reading, typing, scrolling, discovery and completion gestures, with scripted task dispatch and returning findings. It does not browse, fetch prices or call OpenAI. Playback pauses offscreen, when the tab is hidden, or with its Pause control; reduced motion starts paused.
