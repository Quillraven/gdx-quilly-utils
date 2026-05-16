import {Component} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Jimp} from 'jimp';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';

@Component({
  selector: 'app-sheet-optimizer',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, ErrorAlertComponent, FormFieldComponent],
  templateUrl: './sheet-optimizer.component.html',
  styleUrl: './sheet-optimizer.component.css'
})
export class SheetOptimizerComponent {
  selectedImage: string | null = null;
  optimizedImage: string | null = null;
  errorDetails: string | null = null;
  optimizedTileWidth: number | null = null;
  optimizedTileHeight: number | null = null;

  form: FormGroup;

  get numCols(): number {
    return this.form.get('numCols')?.value || 4;
  }

  get numRows(): number {
    return this.form.get('numRows')?.value || 4;
  }

  get outputFileName(): string {
    return this.form.get('outputFileName')?.value || 'optimized';
  }

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      numCols: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      numRows: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      outputFileName: ['optimized', [Validators.required, Validators.minLength(1), this.validationService.validFilenameValidator]]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
      this.optimizedImage = null;
      this.errorDetails = null;
      this.optimizedTileWidth = null;
      this.optimizedTileHeight = null;
    };
    reader.readAsDataURL(input.files[0]);
  }

  async optimizeSheet(): Promise<void> {
    this.errorDetails = null;
    if (!this.selectedImage) return;

    try {
      const image = await Jimp.read(this.selectedImage);
      const cols = this.numCols;
      const rows = this.numRows;
      const tileW = Math.floor(image.bitmap.width / cols);
      const tileH = Math.floor(image.bitmap.height / rows);

      // Scan each frame's pixels to find tight bounding boxes
      const totalFrames = rows * cols;
      const frameBounds: { x: number; y: number; w: number; h: number }[] = [];

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

      // Find tightest bounding box across all frames
      let maxW = 0;
      let maxH = 0;
      for (const b of frameBounds) {
        if (b.w > maxW) maxW = b.w;
        if (b.h > maxH) maxH = b.h;
      }
      if (maxW === 0 || maxH === 0) {
        this.errorDetails = 'All frames are fully transparent.';
        return;
      }

      // Build output sheet: center each frame's content in maxW x maxH, preserve grid layout
      const outW = maxW * cols;
      const outH = maxH * rows;
      const output = new Jimp({width: outW, height: outH, color: 0x00000000});

      for (let i = 0; i < totalFrames; i++) {
        const b = frameBounds[i];
        if (b.w === 0 || b.h === 0) continue;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const frame = await Jimp.read(this.selectedImage!);
        frame.crop({x: b.x, y: b.y, w: b.w, h: b.h});
        const offsetX = col * maxW + Math.floor((maxW - b.w) / 2);
        const offsetY = row * maxH + Math.floor((maxH - b.h) / 2);
        output.composite(frame, offsetX, offsetY);
      }

      const buffer = await output.getBuffer('image/png');
      const base64 = buffer.toString('base64');
      this.optimizedImage = `data:image/png;base64,${base64}`;
      this.optimizedTileWidth = maxW;
      this.optimizedTileHeight = maxH;
    } catch (error) {
      console.error('Error during sheet optimization:', error);
      this.optimizedImage = null;
      this.errorDetails = error instanceof Error ? error.message : String(error);
    }
  }

  async downloadOptimized(): Promise<void> {
    if (!this.optimizedImage) return;
    await this.downloadService.downloadImage(this.optimizedImage, `${this.outputFileName}.png`);
  }
}
