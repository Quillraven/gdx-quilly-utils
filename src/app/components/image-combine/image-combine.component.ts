import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Jimp} from 'jimp';
import {NgClass} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';

@Component({
  selector: 'app-image-combine',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    ErrorAlertComponent,
    FormFieldComponent
  ],
  templateUrl: './image-combine.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-combine.component.css'
})
export class ImageCombineComponent {
  selectedImages = signal<string[]>([]);
  originalFileNames = signal<string[]>([]);
  combinedImageUrl = signal<string | null>(null);
  errorDetails = signal<string | null>(null);
  draggedIndex = signal<number>(-1);
  dragOverIndex = signal<number>(-1);

  // Form group for validation
  form: FormGroup;

  // Properties accessed through the form
  get gridWidth(): number {
    return this.form.get('gridWidth')?.value || 2;
  }

  get gridHeight(): number {
    return this.form.get('gridHeight')?.value || 2;
  }

  get outputFileName(): string {
    return this.form.get('outputFileName')?.value || 'Combined';
  }

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      gridWidth: [2, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      gridHeight: [2, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      outputFileName: ['Combined', [Validators.required, Validators.minLength(1), this.validationService.validFilenameValidator]]
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) {
      return;
    }

    this.errorDetails.set(null);
    // New selection invalidates current combined output
    this.combinedImageUrl.set(null);
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImages.update(images => [...images, reader.result as string]);
        this.originalFileNames.update(names => [...names, file.name]);
      };
      reader.readAsDataURL(file);
    });
  }

  clearImages(): void {
    this.selectedImages.set([]);
    this.originalFileNames.set([]);
    this.draggedIndex.set(-1);
    this.dragOverIndex.set(-1);
    this.errorDetails.set(null);
  }

  async combineImages(): Promise<void> {
    this.errorDetails.set(null);
    if (this.selectedImages().length === 0) {
      console.warn("No images have been selected to combine.");
      this.combinedImageUrl.set(null);
      return;
    }

    if (this.form.invalid) {
      console.warn("Form is invalid. Please correct the errors.");
      this.combinedImageUrl.set(null);
      return;
    }

    if (this.selectedImages().length > this.gridWidth * this.gridHeight) {
      this.errorDetails.set("The chosen grid size is too small to fit all selected images.");
      return;
    }

    try {
      // Load all images with Jimp
      const jimpImages = [];
      for (const dataUrl of this.selectedImages()) {
        const jimpImage = await Jimp.read(dataUrl);
        jimpImages.push(jimpImage);
      }

      if (jimpImages.length === 0) {
        this.errorDetails.set("Failed to load any images.");
        console.error(this.errorDetails());
        return;
      }

      // Determine the size of the new image
      let newWidth = 0;
      let newHeight = 0;
      let imageIndex = 0;
      for (let y = 0; y < this.gridHeight; y++) {
        let rowWidth = 0;
        let maxHeight = 0;
        for (let x = 0; x < this.gridWidth; x++) {
          if (imageIndex < jimpImages.length) {
            rowWidth += jimpImages[imageIndex].bitmap.width;
            if (jimpImages[imageIndex].bitmap.height > maxHeight) {
              maxHeight = jimpImages[imageIndex].bitmap.height;
            }
            imageIndex++;
          }
        }
        if (newWidth < rowWidth) {
          newWidth = rowWidth;
        }
        newHeight += maxHeight;
      }

      // Create a new image with the combined dimensions
      const combinedImage = new Jimp({width: newWidth, height: newHeight});

      // Place each image in the grid
      imageIndex = 0;
      let currentY = 0;
      for (let y = 0; y < this.gridHeight; y++) {
        let currentX = 0;
        let prevMaxHeight = 0;
        for (let x = 0; x < this.gridWidth; x++) {
          if (imageIndex < jimpImages.length) {
            // Use blit to copy the image to the correct position in the grid
            if (jimpImages[imageIndex].bitmap.height > prevMaxHeight) {
              prevMaxHeight = jimpImages[imageIndex].bitmap.height;
            }

            combinedImage.blit({src: jimpImages[imageIndex], x: currentX, y: currentY});
            currentX += jimpImages[imageIndex].bitmap.width;
            imageIndex++;
          }
        }
        currentY += prevMaxHeight;
      }

      // Convert the combined image to a data URL
      const buffer = await combinedImage.getBuffer("image/png");
      const base64String = buffer.toString('base64');
      this.combinedImageUrl.set(`data:image/png;base64,${base64String}`);
    } catch (error) {
      console.error('Error during image combination:', error);
      this.combinedImageUrl.set(null);
      if (error instanceof Error) {
        this.errorDetails.set(error.message);
      } else {
        this.errorDetails.set(String(error));
      }
    }
  }

  async downloadCombinedImage(): Promise<void> {
    const combinedImageUrl = this.combinedImageUrl();
    if (!combinedImageUrl) {
      console.warn('No combined image available to download.');
      return;
    }

    try {
      await this.downloadService.downloadImage(combinedImageUrl, `${this.outputFileName}.png`);
    } catch (error) {
      console.error('Error downloading combined image:', error);
      if (error instanceof Error) {
        this.errorDetails.set(error.message);
      } else {
        this.errorDetails.set(String(error));
      }
    }
  }

  // Drag and drop methods
  onDragStart(index: number): void {
    this.draggedIndex.set(index);
    document.body.classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onDragLeave(): void {
    this.dragOverIndex.set(-1);
  }

  onDragEnd(): void {
    this.draggedIndex.set(-1);
    this.dragOverIndex.set(-1);
    document.body.classList.remove('dragging');
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (this.draggedIndex() === -1 || this.draggedIndex() === targetIndex) {
      this.dragOverIndex.set(-1);
      document.body.classList.remove('dragging');
      return;
    }

    // Swap the images and file names
    const draggedIndex = this.draggedIndex();
    this.selectedImages.update(images => {
      const next = [...images];
      [next[draggedIndex], next[targetIndex]] = [next[targetIndex], next[draggedIndex]];
      return next;
    });
    this.originalFileNames.update(names => {
      const next = [...names];
      [next[draggedIndex], next[targetIndex]] = [next[targetIndex], next[draggedIndex]];
      return next;
    });

    // Reset the indices
    this.draggedIndex.set(-1);
    this.dragOverIndex.set(-1);

    // Remove dragging class from body
    document.body.classList.remove('dragging');
  }
}
