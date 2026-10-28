/// <reference types="vitest/globals" />
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {Jimp} from 'jimp';
import {
  Bitmap,
  CharacterFrameExtractorService,
  detectSheetName,
  ExtractSettings,
  findDuplicateKeys,
  SheetInput
} from './character-frame-extractor.service';

const FIXTURES = join(process.cwd(), 'test-fixtures');

function solidBitmap(width: number, height: number, rects: {x: number; y: number; w: number; h: number}[]): Bitmap {
  const data = new Uint8Array(width * height * 4);
  for (const {x, y, w, h} of rects) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        data.set([255, 0, 0, 255], (py * width + px) * 4);
      }
    }
  }
  return {width, height, data};
}

function sheet(name: string, bitmap: Bitmap, animation: string, rows = 1, direction = ''): SheetInput {
  return {name, bitmap, animation, direction, rows};
}

const SETTINGS: ExtractSettings = {directions: ['down', 'left', 'right', 'up'], frameWidth: null, anchor: 'bottom-center'};

describe('detectSheetName', () => {
  it.each([
    ['Swordsman_lvl2_Walk_without_shadow.png', 'walk', ''],
    ['Swordsman_lvl2_attack_without_shadow.png', 'attack', ''],
    ['Swordsman_lvl2_Walk_Attack_without_shadow.png', 'attack', ''],
    ['Slime2_Death_with_shadow.png', 'death', ''],
    ['Lancer_Idle.png', 'idle', ''],
    ['Lancer_Down_Attack.png', 'attack', 'down'],
    ['Lancer_DownRight_Defence.png', 'defence', 'down_right'],
    ['Lancer_UpRight_Attack.png', 'attack', 'up_right'],
    ['hero-right-run.png', 'run', 'right']
  ])('%s -> %s %s', (fileName, animation, direction) => {
    expect(detectSheetName(fileName)).toEqual({animation, direction});
  });
});

describe('CharacterFrameExtractorService', () => {
  const service = new CharacterFrameExtractorService();

  it('reports duplicated animation and direction pairs', () => {
    expect(findDuplicateKeys([
      {animation: 'attack', direction: 'down'},
      {animation: 'attack', direction: 'up'},
      {animation: 'attack', direction: 'down'}
    ])).toEqual(['attack_down']);
  });

  it('rejects duplicates, bad grids and empty sheets', () => {
    const empty = solidBitmap(8, 8, []);
    expect(() => service.extract([sheet('a', empty, 'idle', 1)], SETTINGS)).toThrow(/no content/);
    expect(() => service.extract([sheet('a', empty, 'idle', 1), sheet('b', empty, 'idle', 1)], SETTINGS)).toThrow(/same animation/);
    expect(() => service.extract([sheet('a', empty, 'idle', 3)], SETTINGS)).toThrow(/Rows must be/);
    expect(() => service.extract([sheet('a', solidBitmap(10, 8, [{x: 0, y: 0, w: 1, h: 1}]), 'idle', 1)], SETTINGS)).toThrow(/not divisible/);
  });

  it('names frames by animation, direction and column and skips empty cells', () => {
    // 2 rows x 3 columns of 4px cells, second column of the first row is empty
    const bitmap = solidBitmap(12, 8, [
      {x: 0, y: 0, w: 2, h: 2}, {x: 8, y: 0, w: 2, h: 2},
      {x: 0, y: 4, w: 2, h: 2}, {x: 4, y: 4, w: 2, h: 2}, {x: 8, y: 4, w: 2, h: 2}
    ]);
    const settings = {...SETTINGS, directions: ['down', 'up']};
    const result = service.extract([sheet('walk.png', bitmap, 'walk', 2)], settings);

    expect(result.frames.map(f => f.name)).toEqual([
      'walk_down_1', 'walk_down_3', 'walk_up_1', 'walk_up_2', 'walk_up_3'
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.sheets[0].frameCount).toBe(5);
  });

  it('names single direction sheets by filename direction and sheets without rows by animation only', () => {
    const bitmap = solidBitmap(8, 4, [{x: 0, y: 0, w: 2, h: 2}, {x: 4, y: 0, w: 2, h: 2}]);
    const result = service.extract([
      sheet('a', bitmap, 'attack', 1, 'down_right'),
      sheet('b', bitmap, 'idle', 1)
    ], SETTINGS);

    expect(result.frames.map(f => f.name)).toEqual(['attack_down_right_1', 'attack_down_right_2', 'idle_1', 'idle_2']);
  });

  it('crops all frames to the union of all sheets', () => {
    const a = solidBitmap(8, 4, [{x: 0, y: 1, w: 2, h: 2}, {x: 4, y: 1, w: 2, h: 2}]);
    const b = solidBitmap(8, 4, [{x: 1, y: 0, w: 3, h: 2}]);
    const result = service.extract([sheet('a', a, 'idle'), sheet('b', b, 'walk')], SETTINGS);

    expect(result.frameWidth).toBe(4);
    expect(result.frameHeight).toBe(3);
    expect(result.sheets.map(s => [s.dx, s.dy])).toEqual([[0, 1], [1, 0]]);
    expect(result.frames.every(f => f.data.length === 4 * 3 * 4)).toBe(true);
  });

  it('aligns sheets with different cell sizes by the anchor', () => {
    // small: 4x4 cells, 2x2 content at the bottom center; big: 8x8 cells, 2x2 content at the bottom center
    const small = solidBitmap(8, 4, [{x: 1, y: 2, w: 2, h: 2}]);
    const big = solidBitmap(16, 8, [{x: 3, y: 6, w: 2, h: 2}]);
    const result = service.extract([sheet('small', small, 'idle'), sheet('big', big, 'walk')], SETTINGS);

    expect(result.frameWidth).toBe(2);
    expect(result.frameHeight).toBe(2);
    expect(result.frames.length).toBe(2);
    expect(result.frames.every(f => f.data.every((value, i) => i % 4 !== 3 || value === 255))).toBe(true);
  });

  it('keeps frames inside their own cell if the shared rect is larger than the cell', () => {
    // content of the small sheet is only in the neighbour cell, the big sheet makes the shared rect wider
    const small = solidBitmap(8, 4, [{x: 5, y: 3, w: 1, h: 1}]);
    const big = solidBitmap(16, 8, [{x: 0, y: 4, w: 16, h: 4}]);
    const result = service.extract([sheet('small', small, 'idle'), sheet('big', big, 'walk')], SETTINGS);

    const idle = result.frames.find(f => f.name === 'idle_2')!;
    const alphaPixels = idle.data.filter((_, i) => i % 4 === 3 && idle.data[i] > 0).length;
    expect(alphaPixels).toBe(1);
  });

  it('supports a frame width for non-square frames', () => {
    const bitmap = solidBitmap(8, 8, [{x: 0, y: 0, w: 1, h: 1}, {x: 4, y: 0, w: 1, h: 1}]);
    const grid = service.analyzeSheet({bitmap, rows: 1, direction: ''}, {directions: SETTINGS.directions, frameWidth: 4});
    expect(grid).toMatchObject({cols: 2, cellWidth: 4, cellHeight: 8});
  });
});

async function loadBitmap(path: string): Promise<Bitmap> {
  const image = await Jimp.read(path);
  return {width: image.bitmap.width, height: image.bitmap.height, data: new Uint8Array(image.bitmap.data)};
}

/** Extracts the frames of the fixture and compares them pixel by pixel with the reference frames. */
async function expectMatchesReference(character: string, directions: string[], sheets: Record<string, string>): Promise<void> {
  const sheetInputs: SheetInput[] = [];
  for (const [file, animation] of Object.entries(sheets)) {
    sheetInputs.push(sheet(file, await loadBitmap(join(FIXTURES, character, 'input', file)), animation, directions.length));
  }
  const result = new CharacterFrameExtractorService().extract(sheetInputs, {directions, frameWidth: null, anchor: 'bottom-center'});

  const expectedDir = join(FIXTURES, character, 'expected');
  const expectedNames = readdirSync(expectedDir).map(f => f.replace('.png', '')).sort();
  expect(result.frames.map(f => f.name).sort()).toEqual(expectedNames);

  for (const frame of result.frames) {
    const expected = await loadBitmap(join(expectedDir, `${frame.name}.png`));
    expect([frame.name, frame.width, frame.height]).toEqual([frame.name, expected.width, expected.height]);
    // the color of fully transparent pixels is irrelevant
    for (let i = 0; i < frame.data.length; i += 4) {
      const alpha = frame.data[i + 3];
      expect(alpha, `${frame.name} alpha at pixel ${i / 4}`).toBe(expected.data[i + 3]);
      if (alpha > 0) {
        expect(Array.from(frame.data.subarray(i, i + 3)), `${frame.name} color at pixel ${i / 4}`)
          .toEqual(Array.from(expected.data.subarray(i, i + 3)));
      }
    }
  }
}

describe('reference frames of slime_slayer', () => {
  it('extracts the swordsman frames', async () => {
    await expectMatchesReference('swordsman', ['down', 'left', 'right', 'up'], {
      'Swordsman_lvl2_Idle_without_shadow.png': 'idle',
      'Swordsman_lvl2_Walk_without_shadow.png': 'walk',
      'Swordsman_lvl2_Hurt_without_shadow.png': 'hurt',
      'Swordsman_lvl2_Death_without_shadow.png': 'death',
      'Swordsman_lvl2_attack_without_shadow.png': 'attack'
    });
  });

  it('extracts the slime-2 frames', async () => {
    await expectMatchesReference('slime-2', ['down', 'up', 'left', 'right'], {
      'Slime2_Idle_without_shadow.png': 'idle',
      'Slime2_Run_without_shadow.png': 'walk',
      'Slime2_Hurt_without_shadow.png': 'hurt',
      'Slime2_Death_without_shadow.png': 'death',
      'Slime2_Attack_without_shadow.png': 'attack'
    });
  });
});
