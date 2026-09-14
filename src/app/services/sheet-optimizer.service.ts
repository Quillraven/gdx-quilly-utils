import {Service} from '@angular/core';
import {Jimp} from 'jimp';

type JimpImage = ReturnType<typeof Jimp.read> extends Promise<infer T> ? T : never;

export interface OptimizedSheet {
  image: JimpImage;
  tileWidth: number;
  tileHeight: number;
}

@Service()
export class SheetOptimizerService {
  /**
   * Optimizes a spritesheet by trimming transparent borders from each frame and computing one
   * common bounding box that preserves every frame's original content position, so that the
   * baseline of animated content stays intact.
   *
   * @param image the source spritesheet (returned by {@link Jimp.read})
   * @param cols number of grid columns
   * @param rows number of grid rows
   * @throws Error when all frames are fully transparent
   */
  optimize(image: JimpImage, cols: number, rows: number): OptimizedSheet {
    const tileW = Math.floor(image.bitmap.width / cols);
    const tileH = Math.floor(image.bitmap.height / rows);

    // Scan each frame's pixels to find tight bounding boxes
    const totalFrames = rows * cols;
    const frameBounds: {x: number; y: number; w: number; h: number}[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const fx = col * tileW;
      const fy = row * tileH;
      let minX = tileW, minY = tileH, maxX = -1, maxY = -1;
      for (let py = 0; py < tileH; py++) {
        for (let px = 0; px < tileW; px++) {
          const idx = ((fy + py) * image.bitmap.width + (fx + px)) * 4;
          if (image.bitmap.data[idx + 3] > 0) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      frameBounds.push(maxX === -1
        ? {x: fx, y: fy, w: 0, h: 0}
        : {x: fx + minX, y: fy + minY, w: maxX - minX + 1, h: maxY - minY + 1});
    }

    // Find the common bounding box across all frames (in tile-relative coords)
    let relMinX = tileW;
    let relMinY = tileH;
    let relMaxX = 0;
    let relMaxY = 0;
    let hasContent = false;
    for (const b of frameBounds) {
      if (b.w === 0 || b.h === 0) continue;
      hasContent = true;
      const relX = b.x - Math.floor(b.x / tileW) * tileW;
      const relY = b.y - Math.floor(b.y / tileH) * tileH;
      if (relX < relMinX) relMinX = relX;
      if (relY < relMinY) relMinY = relY;
      if (relX + b.w > relMaxX) relMaxX = relX + b.w;
      if (relY + b.h > relMaxY) relMaxY = relY + b.h;
    }
    if (!hasContent) {
      throw new Error('All frames are fully transparent.');
    }
    const boxW = relMaxX - relMinX;
    const boxH = relMaxY - relMinY;

    // Crop every frame to the same bounding box, preserving each frame's original content position
    const outW = boxW * cols;
    const outH = boxH * rows;
    const output = new Jimp({width: outW, height: outH, color: 0x00000000});

    for (let i = 0; i < totalFrames; i++) {
      const b = frameBounds[i];
      if (b.w === 0 || b.h === 0) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const fx = col * tileW;
      const fy = row * tileH;
      const frame = image.clone();
      frame.crop({x: fx + relMinX, y: fy + relMinY, w: boxW, h: boxH});
      const offsetX = col * boxW;
      const offsetY = row * boxH;
      output.composite(frame, offsetX, offsetY);
    }

    return {image: output as JimpImage, tileWidth: boxW, tileHeight: boxH};
  }
}
