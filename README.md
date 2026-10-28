# Quilly's GDX Utilities

> A friendly web toolbox for LibGDX 2D games — clean your tiles, split your sprites and optimize your sheets, right in the browser. No installs, no accounts, no fuss.

## Live app

Everything runs client-side, so your images never leave your machine. Give it a try:

**https://quillraven.github.io/gdx-quilly-utils/**

## The tools at a glance

| Tool | What it does | Best for |
| --- | --- | --- |
| **Tileset Extruder** | Adds padding around every tile to stop texture bleeding | Clean, seam-free tilemaps |
| **Spritesheet Splitter** | Cuts a spritesheet into individual tiles | Animations & asset export |
| **Image Combiner** | Stitches several images into one grid layout | Packing related icons or frames |
| **Sheet Optimizer** | Trims empty space around every frame and extracts the frames of multi-sheet characters | Slim, tidy animation sheets and frames that line up |
| **Gradle Kotlin Template** | Generates a modern Gradle Kotlin DSL project | Starting a LibGDX Kotlin game fast |

## The toolkit

### Tileset Extruder

Texture bleeding is that ugly line between adjacent tiles. This tool fixes it by **extruding (padding) each tile** in your tileset so sprites never leak into their neighbours.

- Upload any tileset image
- Set tile width, height, margin & spacing
- Choose how much to extrude
- Live preview before you download
- Download the polished image, ready for your game

### Spritesheet Splitter

Turn one big spritesheet into a neat stack of individual tiles.

- Upload your spritesheet
- Split by **tile count** *or* **tile size**
- Skip the first `n` and last `n` tiles if you have unwanted extras
- Pick a base filename for the output
- Preview every extracted tile
- Download everything as a single ZIP file

### Image Combiner

Patch multiple images into one organized grid in seconds.

- Upload several images at once
- Choose grid width & height
- **Drag and drop to reorder** images before combining
- Preview the final composition
- Custom filename, then download

### Sheet Optimizer

Spritesheets often carry wasted transparent space. The optimizer **trims the borders of every frame and keeps the art aligned**, giving you tighter, cleaner frames. It has two modes:

**Character (multi-sheet)** — for a character whose animations are spread over several sheets, possibly with different frame sizes.

- Upload all sheets of the character; animation (walk, run, hurt, attack, death, idle, ...) and a direction in the file name (e.g. `DownRight`) are detected and can be edited
- Sheets without a direction in their name have one row per direction: 4 (down, left, right, up) or 8 (with diagonals), in an order you can change
- Frames can be non-square (set a frame width) and are aligned by an anchor (bottom-center by default) when sheet frame sizes differ
- Every frame of every sheet is cropped to one shared rect, so all frames have the same size and line up across animations
- Preview the frames (`walk_down_1`, `attack_right_3`, ...) and download them as a flat ZIP

**Single sheet** — upload one sprite sheet, describe the frame grid, preview and download the optimized sheet including each frame's new dimensions.

### Gradle Kotlin Template

A **modern Gradle Kotlin DSL template** for LibGDX Kotlin projects — less boilerplate, more building.

- Version catalog (`libs.versions.toml`) for tidy dependency management
- `build-logic` directory with reusable convention plugins
- Kotlin from the ground up

## Development

Built with **Angular 22**, Tailwind CSS & daisyUI, using `pnpm`.

```bash
pnpm install     # install dependencies
ng serve         # run Angular on localhost
```
