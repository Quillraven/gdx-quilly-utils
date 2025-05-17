import {Component} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {Jimp} from 'jimp';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';

@Component({
  selector: 'app-image-combine',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    ErrorAlertComponent
  ],
  templateUrl: './image-combine.component.html',
  styleUrl: './image-combine.component.css'
})
export class ImageCombineComponent {
  selectedImages: string[] = [];
  originalFileNames: string[] = [];
  combinedImageUrl: string | null = null;
  errorDetails: string | null = null;
  draggedIndex: number = -1;
  dragOverIndex: number = -1;

  // Form group for validation
  form: FormGroup;

  // Properties accessed through the form
  get gridWidth(): number {
    return this.form.get('gridWidth')?.value || 2;
  }

  get gridHeight(): number {
    return this.form.get('gridHeight')?.value || 1;
  }

  get outputFileName(): string {
    return this.form.get('outputFileName')?.value || 'Combined';
  }

  constructor(private fb: FormBuilder, private downloadService: DownloadService) {
    this.form = this.fb.group({
      gridWidth: [1, [Validators.required, Validators.min(1), this.integerValidator]],
      gridHeight: [1, [Validators.required, Validators.min(1), this.integerValidator]],
      outputFileName: ['Combined', [Validators.required, Validators.minLength(1), this.validFilenameValidator]]
    });
  }

  // Custom validator for integers
  integerValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (!Number.isInteger(value)) {
      return {notAnInteger: true};
    }

    return null;
  }

  // Custom validator for filenames
  validFilenameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Check for invalid characters in the filename
    const invalidChars = /[<>:"\/\\|?*]/;
    if (invalidChars.test(value)) {
      return {invalidFilename: true};
    }

    // Check if the filename is just whitespace
    if (value.trim() === '') {
      return {blankFilename: true};
    }

    return null;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImages = [];
      this.originalFileNames = [];
      this.combinedImageUrl = null;
      this.errorDetails = null;

      // Process each selected file
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          this.selectedImages.push(reader.result as string);
          this.originalFileNames.push(file.name);
        };
        reader.readAsDataURL(file);
      });
    } else {
      this.selectedImages = [];
      this.originalFileNames = [];
      this.combinedImageUrl = null;
      this.errorDetails = null;
    }
  }

  async combineImages(): Promise<void> {
    this.errorDetails = null;
    if (this.selectedImages.length === 0) {
      console.warn("No images have been selected to combine.");
      this.combinedImageUrl = null;
      return;
    }

    if (this.form.invalid) {
      console.warn("Form is invalid. Please correct the errors.");
      this.combinedImageUrl = null;
      return;
    }

    if (this.selectedImages.length > this.gridWidth * this.gridHeight) {
      this.errorDetails = "The chosen grid size is too small to fit all selected images.";
      return;
    }

    try {
      // Load all images with Jimp
      const jimpImages = [];
      for (const dataUrl of this.selectedImages) {
        const jimpImage = await Jimp.read(dataUrl);
        jimpImages.push(jimpImage);
      }

      if (jimpImages.length === 0) {
        this.errorDetails = "Failed to load any images.";
        console.error(this.errorDetails);
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
      for (let y = 0; y < this.gridHeight; y++) {
        let currentX = 0;
        for (let x = 0; x < this.gridWidth; x++) {
          if (imageIndex < jimpImages.length) {
            // Use blit to copy the image to the correct position in the grid
            let currentY = 0;
            let z = imageIndex - this.gridWidth;
            while (z >= 0) {
              currentY += jimpImages[z].bitmap.height;
              z -= this.gridWidth;
            }
            combinedImage.blit({src: jimpImages[imageIndex], x: currentX, y: currentY});
            currentX += jimpImages[imageIndex].bitmap.width;
            imageIndex++;
          }
        }
      }

      // Convert the combined image to a data URL
      const buffer = await combinedImage.getBuffer("image/png");
      const base64String = buffer.toString('base64');
      this.combinedImageUrl = `data:image/png;base64,${base64String}`;
    } catch (error) {
      console.error('Error during image combination:', error);
      this.combinedImageUrl = null;
      if (error instanceof Error) {
        this.errorDetails = error.message;
      } else {
        this.errorDetails = String(error);
      }
    }
  }

  async downloadCombinedImage(): Promise<void> {
    if (!this.combinedImageUrl) {
      console.warn('No combined image available to download.');
      return;
    }

    try {
      await this.downloadService.downloadImage(this.combinedImageUrl, `${this.outputFileName}.png`);
    } catch (error) {
      console.error('Error downloading combined image:', error);
      if (error instanceof Error) {
        this.errorDetails = error.message;
      } else {
        this.errorDetails = String(error);
      }
    }
  }

  // Drag and drop methods
  onDragStart(index: number): void {
    this.draggedIndex = index;
    document.body.classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(): void {
    this.dragOverIndex = -1;
  }

  onDragEnd(): void {
    this.draggedIndex = -1;
    this.dragOverIndex = -1;
    document.body.classList.remove('dragging');
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (this.draggedIndex === -1 || this.draggedIndex === targetIndex) {
      this.dragOverIndex = -1;
      document.body.classList.remove('dragging');
      return;
    }

    // Swap the images and file names
    [this.selectedImages[this.draggedIndex], this.selectedImages[targetIndex]] = [this.selectedImages[targetIndex], this.selectedImages[this.draggedIndex]];
    [this.originalFileNames[this.draggedIndex], this.originalFileNames[targetIndex]] = [this.originalFileNames[targetIndex], this.originalFileNames[this.draggedIndex]];

    // Reset the indices
    this.draggedIndex = -1;
    this.dragOverIndex = -1;

    // Remove dragging class from body
    document.body.classList.remove('dragging');
  }
}
