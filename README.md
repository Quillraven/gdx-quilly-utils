# Quilly's GDX Utilities

![Angular](https://img.shields.io/badge/Angular-19.2.14-purple?logo=angular)

This repository contains a set of utilities that are typically needed for a 2D game using LibGDX.
It is hosted as a GitHub page under following [link](https://quillraven.github.io/gdx-quilly-utils/).

## Tile Extruder

A utility to prevent texture bleeding in tiled games by adding padding around each tile in your tileset. This ensures clean rendering when tiles are placed next to each other in a game world.

Features:
- Upload your tileset image
- Configure tile width, height, margin, spacing, and extrusion amount
- Preview the extruded tileset
- Download the processed image for use in your game

## Spritesheet Splitter

A tool to split a spritesheet into individual image tiles. This utility divides your spritesheet into a grid of tiles based on the number of rows and columns you specify.

Features:
- Upload your spritesheet image
- Configure the number of tiles on x-axis and y-axis
- Options to ignore first n and last n tiles
- Set a base filename for the output tiles
- Preview all extracted tiles
- Download all tiles as a ZIP file

## Image Combiner

A tool to combine multiple images into a single grid layout. This utility arranges your uploaded images in a grid based on the dimensions you specify.

Features:
- Upload multiple images
- Configure grid width and height for arrangement
- Drag and drop to reorder images
- Preview the combined image
- Set a custom filename for the output
- Download the combined image

## Gradle Kotlin Template

A modern Gradle Kotlin DSL based template for creating LibGDX projects using Kotlin.
It uses a version catalog and buildSrc directory for convention plugins.
