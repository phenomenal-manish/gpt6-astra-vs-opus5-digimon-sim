# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.
- Both `astra-build/` and `opus5-build/` are static `file://`-openable demos (no server/build step); each has its own README with controls and validation notes. `COMPARISON.md` at the repo root is the cross-build write-up, with supporting assets in `media/` (see `media/README.md` and `media/INDEX.md`).
- Screen recording of either demo: this host has no OS-level screen-recording permission grantable to a non-interactive session — `ffmpeg -f avfoundation -i "<screen device>:none"` hangs forever waiting on the macOS TCC consent dialog (confirmed by driving it: it never times out, must be killed). Instead, drive the build with `chrome-devtools-axi`, take a `screenshot` after each action, and assemble the PNG sequence into video with `ffmpeg -f image2 -framerate 1 -i f%03d.png -vf fps=24,format=yuv420p -c:v libx264 ...` (works without any OS permission, since it's pure image-to-video encoding via CDP screenshots, not live screen capture).
- This host's `ffmpeg` build has no `drawtext` filter (no libfreetype), so captioned image composites (e.g. the side-by-side comparison images in `media/comparisons/`) can't be built with ffmpeg text overlays. Build them as a small HTML page (two `<img>` tags + CSS captions) and capture it with `chrome-devtools-axi screenshot --full-page` instead.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
