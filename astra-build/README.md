# Digi Garden

A tiny, playable Digimon raising and battle demo. Original pixel artwork, a mossy digital habitat, and a quick Koromon → Agumon → Greymon loop.

## Run

Open **index.html** directly in a modern browser. No server, install, build step, network access, game engine, fonts, or asset downloads are needed. All runtime files are in this folder.

## Play

- **Feed** (`F`) restores fullness and increases bond and power.
- **Train** (`T`) spends 15 fullness to gain more power. Feed again when training is disabled.
- Both actions earn care XP. At **3 XP**, Koromon becomes Agumon; at **8 XP**, Agumon becomes Greymon. Continue past each evolution reveal.
- **Enter battle** (`B`) unlocks at Rookie. A Champion has more health and usually wins with sensible commands.
- Attack to deal damage and charge **Mega Flame**. Guard restores 8 health and blocks 80% of the incoming damage, rounded up. Three attacks/guards charge the special.
- BlackAgumon uses two claw swipes, then a stronger Pepper Breath. Its next move is always shown. Guard the heavy attack.
- Win or lose, return to the garden with your raising progress intact. The session tracks wins and losses.
- Sound is optional and starts muted. **New partner** immediately resets all raising progress and the record, including during a battle.

For a quick recording: **Feed, Train, Train → reveal Agumon → Feed, Train, Train, Feed, Train → reveal Greymon → Battle → Attack, Attack, Guard, Mega Flame.** This route shows both evolutions and a victory in about a minute at a relaxed pace.

## Implementation choices

- Plain HTML, CSS, and JavaScript with relative file paths, so `file://` works offline.
- Original pixel geometry and scenery drawn with the Canvas 2D API. The static environment is cached on a canvas; creatures, effects, and fireflies are drawn over it. No external artwork or asset packs.
- A small explicit state object for care, plus a separate battle state. Brief action locks prevent double turns; reset clears pending callbacks to avoid stale actions changing a fresh partner.
- Deterministic combat, visible enemy intent, and no death penalty make a short, understandable loop. Care affects the battle through power, bond, and evolution-dependent health.
- Responsive HTML controls and HUD; canvas combat framing adapts to narrow screens. Labeled controls, native progress elements, keyboard shortcuts, a live activity message, and reduced-motion support cover the core accessibility needs.
- Optional synthesized Web Audio notes keep the download small. No storage, tracking, or requests to services.

## Validation

Validated by opening the file directly in Chromium with `chrome-devtools-axi`. Desktop inspected at 1440 × 1080; mobile battle inspected with a 390 × 844 emulated touch viewport. No horizontal overflow at either size. JavaScript syntax checked with `node --check script.js`.

`browser-check.js` contains a repeatable browser integration check. It drives the rendered controls and asserts 18 conditions: both evolutions, arena unlocking, Rookie defeat, Champion victory, win/loss counts, guard math, special charging, repeated-click locking, hunger gating/recovery, and resets during care and combat. From the repository root, with this page selected:

```sh
CHROME_DEVTOOLS_AXI_SESSION=digimon-astra chrome-devtools-axi eval "$(cat astra-build/browser-check.js)"
```

This check resets the current session and ends with a fresh Koromon. It is a development helper, not loaded by the game.

## Scope and limitations

- An unofficial fan demo; Digimon names and characters belong to their respective owners. Artwork here is independently drawn in code.
- One partner line, one rival, three combat commands. No inventory, branching evolutions, passive hunger drain, or persistent save. Reloading starts over.
- Feeding at full fullness still earns care XP. This is intentional for the quick demo loop; training is the faster route to battle power.
- Desktop Chromium and mobile emulation were tested. Safari, Firefox, physical touch devices, and screen-reader navigation were not independently verified. Audio uses Web Audio with a silent fallback; its audible quality was not manually reviewed.
- Decorative canvas artwork has a changing text label but is not individually navigable. Combat health, intent, commands, and outcomes also appear as HTML.
