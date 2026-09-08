# Digilab

A small Digimon-style raising sim that runs in one browser tab. Hatch an egg,
feed and train what comes out, watch it digivolve through four forms beyond the egg,
then send it out to fight.

Built from scratch for this brief: no engine, no framework, no asset files, no
build step. Three files, ~1,470 lines of JS, and every sprite is generated at
runtime.

## Run it

Open `index.html` in any modern browser — double-click the file, or:

```
open opus5-build/index.html          # macOS
xdg-open opus5-build/index.html      # Linux
start opus5-build\index.html         # Windows
```

No server, no install. `file://` works because there are no modules, no fetches
and no external requests of any kind.

## The loop

| Key | Action | Effect |
|-----|--------|--------|
| `1` | Feed | +1 fullness, +max health, +5 growth. Refuses when full. |
| `2` | Rest | +42 energy, heals ~35%, +2 growth. |
| `3` `4` `5` | Train Power / Guard / Speed | +1–2 to that stat, +12 growth. Costs 1 fullness and 18 energy. |
| `B` | Battle | Unlocked at Rookie. Auto-resolving turn fight. |
| `E` | Digivolve | Appears once the growth meter fills. |

Growth thresholds are 12 → 24 → 45 → 80, and a battle win is worth 35, so a
full run from egg to Champion is roughly 20–25 clicks (about a minute). That was
tuned deliberately for a short screen recording rather than for pacing over days.

**Stages:** Digi-Egg → Nubbimon (Baby) → Puffmon (In-training) → Kobumon
(Rookie) → one of three Champions. The Champion you get is chosen by your
highest stat at the moment you digivolve: Power → **Blazorimon**, Guard →
**Bouldramon**, Speed → **Talonmon**. Ties resolve Power > Guard > Speed.

Opponents are **Grubmon**, **Frostmon** and **Skullmon**, rolled fresh each
fight with a stat budget of 76–112% of your own and different stat biases, so
battles are winnable but genuinely uncertain. Winning grants +35 growth, +2 to a
random stat and +5 max health; losing costs energy and drops you to 15% health.

## Key implementation choices

**Sprites are code, not pixels.** Every creature is drawn at runtime onto a
32×32 grid using four primitives — `disc`, `box`, `tri` and `taper` (a limb made
of discs marched along a line). A single `finish()` pass then fakes a light
source from the upper-left and wraps the whole shape in a 1px outline. That one
post-process is what makes stacked ellipses read as deliberate pixel art rather
than as blobs, and it means a new creature costs about 15 lines. Each finished
grid is rasterised once into an offscreen canvas and cached, so the frame loop
is just `drawImage` with `imageSmoothingEnabled = false`.

**A hand-coded 5×7 bitmap font.** All in-world display type — creature names,
damage numbers, `VICTORY`, `DIGIVOLVE` — is drawn straight onto the canvas from
a glyph table, run-length filled per row. That keeps headline type crisp at any
zoom, removes the last external dependency (no webfont request), and splits the
typography cleanly: the pixel font owns the game world, plain system sans owns
the device chrome around it.

**The device shell is the design.** The page is styled as a translucent
"atomic purple" 1997 handheld — moulded gradient, inset screen bezel, visible
screws, chunky buttons that physically depress, and an amber-green LCD strip for
telemetry. The one place the design spends its boldness is the digivolution
sequence; everything else stays quiet so that moment lands.

**Everything is one render loop.** Care scene, digivolution and battle are three
draw branches over the same 256×160 canvas, upscaled with `image-rendering:
pixelated`. State lives in three plain objects: `G` (the creature), `V` (view
effects), `B` (the current battle). No framework, no reactive layer — a
`syncUI()` call after each action writes the DOM.

**Battle is watched, not clicked.** Turn order is by Speed, with a second action
for anyone 1.6× faster than their opponent. Each turn is a windup → strike →
recover beat, so damage numbers, screen shake and HP drain have room to read.
Care state feeds combat: a well-fed, rested creature hits up to ~24% harder,
which is what ties the raising half to the fighting half.

**Audio is synthesised.** Square-wave blips from a `WebAudio` oscillator, built
lazily on the first click so browsers don't block the context. Mute toggle in
the header.

## Limitations and known gaps

- **No persistence.** Refreshing restarts from the egg. Deliberate for a demo,
  but there is no `localStorage` save.
- **No death, no care mistakes, no sleep cycle.** Hunger ticks down every 15s
  and drains energy at zero, but nothing can kill the creature while you idle.
  The classic virtual-pet punishment loop is missing on purpose.
- **Champion is the ceiling.** There is no Ultimate/Mega tier, and once you are
  a Champion the growth meter just reads "max" — the only progression left is
  battle records and stat gains.
- **Digivolution branching is shallow.** Only the Rookie → Champion step
  branches, and only on your single highest stat. Ties are resolved by a fixed
  priority rather than by anything the player can see.
- **`prefers-reduced-motion` is partially honoured.** It removes camera shake and
  caps full-screen flashes (the photosensitivity risks) and disables CSS
  transitions, but gameplay animation still plays — it is the content.
- **Verified on Chrome only.** Layout, canvas, and the full egg → Champion →
  battle loop were exercised in Chrome at 390px and 700px wide with no console
  errors. Firefox and Safari were not tested; nothing used is exotic
  (`webkitAudioContext` is included as a fallback), but I did not confirm it.
- **Touch is untested.** Buttons are large enough for thumbs and the layout
  collapses correctly at phone widths, but I only drove it with mouse and
  keyboard.
- **Balance is lightly tuned.** In an automated soak the Champion went 1–1
  against random opponents, which is roughly the intent, but the stat curve was
  not tested at the extremes (e.g. dumping every point into Guard).
