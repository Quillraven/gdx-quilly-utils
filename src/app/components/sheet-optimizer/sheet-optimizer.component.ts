import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Jimp} from 'jimp';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {SheetOptimizerService} from '../../services/sheet-optimizer.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';
import {DropZoneComponent} from '../drop-zone/drop-zone.component';
import {ImagePreviewComponent, Zoom} from '../image-preview/image-preview.component';

@Component({
  selector: 'app-sheet-optimizer',
  imports: [FormsModule, ReactiveFormsModule, ErrorAlertComponent, FormFieldComponent, DropZoneComponent, ImagePreviewComponent],
  templateUrl: './sheet-optimizer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sheet-optimizer.component.css'
})
export class SheetOptimizerComponent {
  selectedImage = signal<string | null>(null);
  optimizedImage = signal<string | null>(null);
  errorDetails = signal<string | null>(null);
  optimizedTileWidth = signal<number | null>(null);
  optimizedTileHeight = signal<number | null>(null);
  linkZoom = signal<boolean>(true);
  originalZoom = signal<Zoom>(1);
  optimizedZoom = signal<Zoom>(1);

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
    private sheetOptimizerService: SheetOptimizerService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      numCols: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      numRows: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      outputFileName: ['optimized', [Validators.required, Validators.minLength(1), this.validationService.validFilenameValidator]]
    });
  }

  onZoomChanged(zoom: Zoom, target: 'original' | 'optimized'): void {
    if (this.linkZoom()) {
      this.originalZoom.set(zoom);
      this.optimizedZoom.set(zoom);
    } else {
      if (target === 'original') {
        this.originalZoom.set(zoom);
      } else {
        this.optimizedZoom.set(zoom);
      }
    }
  }

  onLinkZoomChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.linkZoom.set(checked);
    if (checked) {
      this.optimizedZoom.set(this.originalZoom());
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) return;
    this.loadImageFile(input.files[0]);
    input.value = '';
  }

  loadImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage.set(reader.result as string);
      this.optimizedImage.set(null);
      this.errorDetails.set(null);
      this.optimizedTileWidth.set(null);
      this.optimizedTileHeight.set(null);
    };
    reader.readAsDataURL(file);
  }

  async optimizeSheet(): Promise<void> {
    this.errorDetails.set(null);
    const selectedImage = this.selectedImage();
    if (!selectedImage) return;

    try {
      const image = await Jimp.read(selectedImage);
      const optimized = this.sheetOptimizerService.optimize(image, this.numCols, this.numRows);
      const buffer = await optimized.image.getBuffer('image/png');
      const base64 = buffer.toString('base64');
      this.optimizedImage.set(`data:image/png;base64,${base64}`);
      this.optimizedTileWidth.set(optimized.tileWidth);
      this.optimizedTileHeight.set(optimized.tileHeight);
    } catch (error) {
      console.error('Error during sheet optimization:', error);
      this.optimizedImage.set(null);
      this.errorDetails.set(error instanceof Error ? error.message : String(error));
    }
  }

  async downloadOptimized(): Promise<void> {
    const optimizedImage = this.optimizedImage();
    if (!optimizedImage) return;
    await this.downloadService.downloadImage(optimizedImage, `${this.outputFileName}.png`);
  }
}
