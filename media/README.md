# Media Directory Content Summary

This directory holds screenshots, comparison composites, and screen recordings from
one manual playthrough of each build (`astra-build/` and `opus5-build/`).

**Directory structure:**
- `astra/` — screenshots from Digi Garden (GPT-6 Astra's build)
- `opus5/` — screenshots from Digilab (Opus 5's build)
- `comparisons/` — side-by-side composites pairing equivalent moments from each build
- `video/` — screen recordings of each playthrough

For a full asset-by-asset description, see [`INDEX.md`](INDEX.md).

**How the comparison images were made:** both builds were driven at the same
1280×900 browser viewport, so the two source screenshots in each composite are
already the same size. They were placed side-by-side into one image with a title,
a one-line subtitle, and a short caption under each side — no cropping, retouching,
or resizing of the original screenshots themselves.

**How the videos were made:** this environment has no OS-level screen-recording
permission available to a non-interactive session (an attempt to record the
physical display with `ffmpeg`'s `avfoundation` device hung waiting on the macOS
screen-recording consent dialog, which nothing here can click through). Instead,
each playthrough was driven with `chrome-devtools-axi` while taking a screenshot
after every meaningful action, and the resulting frame sequence was assembled into
an MP4 with `ffmpeg`'s image2 muxer (real captured frames of the actual driven
session, held for roughly a second each and re-encoded at 24fps — so the motion
reads as a slideshow of key moments rather than smooth continuous footage). Neither
video needed recompression for size: `astra-demo.mp4` is 18s / ~370KB and
`opus5-demo.mp4` is 37s / ~630KB, both H.264 MP4 at 1280×900.

**What isn't covered:** mobile/touch input and audio quality were not exercised —
both builds' own READMEs already flag these as unverified, and nothing about
driving them here changes that.
