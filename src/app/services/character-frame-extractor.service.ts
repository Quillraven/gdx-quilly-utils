import {Service} from '@angular/core';

/** Raw RGBA bitmap (4 bytes per pixel), e.g. the `bitmap` of a Jimp image. */
export interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Point inside a cell that is used to align the cells of sheets with different cell sizes.
 * It has no effect when all sheets use the same cell size.
 */
export type Anchor = 'bottom-center' | 'center' | 'top-left';

export const ANCHORS: Anchor[] = ['bottom-center', 'center', 'top-left'];

export const ANIMATION_TERMS = ['walk', 'run', 'hurt', 'attack', 'death', 'idle'];

export const DEFAULT_DIRECTIONS_4 = ['down', 'left', 'right', 'up'];
export const DEFAULT_DIRECTIONS_8 = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right'];

export function defaultDirections(count: number): string[] {
  return count === 8 ? DEFAULT_DIRECTIONS_8 : DEFAULT_DIRECTIONS_4;
}

export interface SheetInput {
  /** Label of the sheet (usually the file name), only used for messages. */
  name: string;
  bitmap: Bitmap;
  animation: string;
  /** Direction of a sheet that contains only one direction. Empty when the sheet has no direction. */
  direction: string;
  /** Number of rows of the sheet. Either 1 or the number of global directions. */
  rows: number;
}

export interface ExtractSettings {
  /** Direction of each row from top to bottom for sheets that have more than one row. */
  directions: string[];
  /** Width of a frame in pixels. When null, frames are square (frame width = cell height). */
  frameWidth: number | null;
  anchor: Anchor;
}

export interface SheetGrid {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  /** Direction of each row, an empty string means that frames are not named with a direction. */
  rowDirections: string[];
}

export interface ExtractedFrame {
  name: string;
  animation: string;
  direction: string;
  /** 1-based column index within the sheet. */
  index: number;
  width: number;
  height: number;
  /** RGBA pixel data. */
  data: Uint8Array;
}

export interface SheetReport {
  name: string;
  animation: string;
  grid: SheetGrid;
  frameCount: number;
  /** Offset of the content of the sheet to the shared frame rect. */
  dx: number;
  dy: number;
}

export interface ExtractResult {
  frameWidth: number;
  frameHeight: number;
  frames: ExtractedFrame[];
  sheets: SheetReport[];
  warnings: string[];
}

export interface SheetNameInfo {
  animation: string;
  direction: string;
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

const SHADOW_SUFFIXES = ['_without_shadow', '_with_shadow', '_no_shadow', '_shadow'];
const VERTICAL = ['up', 'down'];
const HORIZONTAL = ['left', 'right'];

/** Key that identifies the frames of a sheet. Two sheets with the same key would overwrite each other. */
export function sheetKey(animation: string, direction: string): string {
  return direction ? `${animation}_${direction}` : animation;
}

/** Returns the keys that are used by more than one sheet. */
export function findDuplicateKeys(sheets: {animation: string; direction: string}[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const sheet of sheets) {
    const key = sheetKey(sheet.animation, sheet.direction);
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }
  return [...duplicates];
}

/**
 * Detects animation and direction of a sheet from its file name, e.g.
 * `Swordsman_lvl2_Walk_without_shadow.png` -> walk, `Lancer_DownRight_Attack.png` -> attack + down_right.
 * The animation is the last known term (walk, run, hurt, ...) of the name. If there is none, then
 * the last word that is not a direction is used.
 */
export function detectSheetName(fileName: string): SheetNameInfo {
  let stem = fileName.replace(/\.[^./]+$/, '');
  for (const suffix of SHADOW_SUFFIXES) {
    if (stem.toLowerCase().endsWith(suffix)) {
      stem = stem.slice(0, stem.length - suffix.length);
      break;
    }
  }

  const tokens = stem
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .map(token => token.toLowerCase())
    .filter(token => token.length > 0);

  let direction = '';
  const words: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    if (VERTICAL.includes(token) && next && HORIZONTAL.includes(next)) {
      direction = `${token}_${next}`;
      i++;
    } else if (HORIZONTAL.includes(token) && next && VERTICAL.includes(next)) {
      direction = `${next}_${token}`;
      i++;
    } else if (VERTICAL.includes(token) || HORIZONTAL.includes(token)) {
      direction = token;
    } else {
      words.push(token);
    }
  }

  const known = [...words].reverse().find(word => ANIMATION_TERMS.includes(word));
  const animation = known ?? words[words.length - 1] ?? 'frame';
  return {animation, direction};
}

@Service()
export class CharacterFrameExtractorService {
  /**
   * Computes the grid of a sheet or returns an error message if the sheet does not match the settings.
   */
  analyzeSheet(sheet: Pick<SheetInput, 'bitmap' | 'direction' | 'rows'>, settings: Pick<ExtractSettings, 'directions' | 'frameWidth'>): SheetGrid | string {
    const {width, height} = sheet.bitmap;
    const rows = sheet.rows;
    if (!Number.isInteger(rows) || rows < 1) {
      return 'Rows must be a positive integer.';
    }
    if (rows > 1 && rows !== settings.directions.length) {
      return `Rows must be 1 or ${settings.directions.length} (number of directions).`;
    }
    if (height % rows !== 0) {
      return `Height ${height}px is not divisible by ${rows} rows.`;
    }

    const cellHeight = height / rows;
    const cellWidth = settings.frameWidth ?? cellHeight;
    if (width % cellWidth !== 0) {
      return `Width ${width}px is not divisible by the frame width ${cellWidth}px.`;
    }

    const rowDirections = rows === 1 ? [sheet.direction] : settings.directions;
    return {rows, cols: width / cellWidth, cellWidth, cellHeight, rowDirections};
  }

  /**
   * Extracts the frames of all sheets of one character. Every frame is cropped to one shared rect: the union
   * of the content of all frames of all sheets, relative to the anchor of each cell. All output frames
   * therefore have the same size and content stays aligned across sheets and animations.
   *
   * @throws Error if a sheet does not match the settings, two sheets have the same name or there is no content
   */
  extract(sheets: SheetInput[], settings: ExtractSettings): ExtractResult {
    if (sheets.length === 0) {
      throw new Error('No sheets to extract.');
    }

    const duplicates = findDuplicateKeys(sheets);
    if (duplicates.length > 0) {
      throw new Error(`Multiple sheets use the same animation and direction: ${duplicates.join(', ')}.`);
    }

    const warnings: string[] = [];
    const prepared = sheets.map(sheet => {
      const grid = this.analyzeSheet(sheet, settings);
      if (typeof grid === 'string') {
        throw new Error(`${sheet.name}: ${grid}`);
      }

      const boxes: (Box | null)[][] = [];
      for (let r = 0; r < grid.rows; r++) {
        const row: (Box | null)[] = [];
        for (let c = 0; c < grid.cols; c++) {
          row.push(this.contentBox(sheet.bitmap, c * grid.cellWidth, r * grid.cellHeight, grid.cellWidth, grid.cellHeight));
        }
        boxes.push(row);
      }

      const anchored = boxes.flat().filter((box): box is Box => box !== null)
        .map(box => this.toAnchorSpace(box, grid, settings.anchor));
      if (anchored.length === 0) {
        throw new Error(`${sheet.name}: no content found.`);
      }

      for (let r = 0; r < grid.rows; r++) {
        const gapAt = boxes[r].findIndex(box => box === null);
        const contentAfterGap = gapAt >= 0 && boxes[r].slice(gapAt).some(box => box !== null);
        if (contentAfterGap) {
          warnings.push(`${sheet.name}: content after an empty cell in row ${r + 1}. Frames are numbered by column and empty cells are skipped.`);
        }
      }

      return {sheet, grid, boxes, union: anchored.reduce(unionOf)};
    });

    const shared = prepared.map(p => p.union).reduce(unionOf);
    const frameWidth = shared.r - shared.l;
    const frameHeight = shared.b - shared.t;

    const frames: ExtractedFrame[] = [];
    const reports: SheetReport[] = [];
    for (const {sheet, grid, boxes, union} of prepared) {
      const [anchorX, anchorY] = this.anchorOffset(grid, settings.anchor);
      let frameCount = 0;
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          if (boxes[r][c] === null) continue;
          const direction = grid.rowDirections[r];
          frames.push({
            name: [sheet.animation, direction, c + 1].filter(part => part !== '').join('_'),
            animation: sheet.animation,
            direction,
            index: c + 1,
            width: frameWidth,
            height: frameHeight,
            data: this.copyRegion(
              sheet.bitmap,
              {x: c * grid.cellWidth, y: r * grid.cellHeight, w: grid.cellWidth, h: grid.cellHeight},
              anchorX + shared.l,
              anchorY + shared.t,
              frameWidth,
              frameHeight
            )
          });
          frameCount++;
        }
      }
      reports.push({
        name: sheet.name,
        animation: sheet.animation,
        grid,
        frameCount,
        dx: union.l - shared.l,
        dy: union.t - shared.t
      });
    }

    return {frameWidth, frameHeight, frames, sheets: reports, warnings};
  }

  private anchorOffset(grid: SheetGrid, anchor: Anchor): [number, number] {
    switch (anchor) {
      case 'bottom-center':
        return [Math.floor(grid.cellWidth / 2), grid.cellHeight];
      case 'center':
        return [Math.floor(grid.cellWidth / 2), Math.floor(grid.cellHeight / 2)];
      case 'top-left':
        return [0, 0];
    }
  }

  private toAnchorSpace(box: Box, grid: SheetGrid, anchor: Anchor): Box {
    const [ax, ay] = this.anchorOffset(grid, anchor);
    return {l: box.l - ax, t: box.t - ay, r: box.r - ax, b: box.b - ay};
  }

  /** Bounding box of all non-transparent pixels of a cell in cell-local coordinates, or null if the cell is empty. */
  private contentBox(bitmap: Bitmap, ox: number, oy: number, w: number, h: number): Box | null {
    let l = w;
    let t = h;
    let r = -1;
    let b = -1;
    for (let y = 0; y < h; y++) {
      const rowStart = ((oy + y) * bitmap.width + ox) * 4;
      for (let x = 0; x < w; x++) {
        if (bitmap.data[rowStart + x * 4 + 3] === 0) continue;
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
    }
    return r < 0 ? null : {l, t, r: r + 1, b: b + 1};
  }

  /**
   * Copies a region of a cell. The region starts at (rx, ry) relative to the cell. Parts of the region
   * outside of the cell stay transparent, so neighbouring cells never leak into a frame.
   */
  private copyRegion(
    bitmap: Bitmap,
    cell: {x: number; y: number; w: number; h: number},
    rx: number,
    ry: number,
    w: number,
    h: number
  ): Uint8Array {
    const out = new Uint8Array(w * h * 4);
    const xStart = Math.max(0, -rx);
    const xEnd = Math.min(w, cell.w - rx);
    if (xEnd <= xStart) return out;
    for (let y = Math.max(0, -ry); y < Math.min(h, cell.h - ry); y++) {
      const srcRow = (cell.y + ry + y) * bitmap.width + cell.x + rx;
      out.set(bitmap.data.subarray((srcRow + xStart) * 4, (srcRow + xEnd) * 4), (y * w + xStart) * 4);
    }
    return out;
  }
}

function unionOf(a: Box, b: Box): Box {
  return {l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b)};
}
