import {Component, OnDestroy} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {CropOptions, Jimp} from 'jimp';
import JSZip from 'jszip';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-image-split',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './image-split.component.html',
  styleUrl: './image-split.component.css'
})
export class ImageSplitComponent implements OnDestroy {
  selectedImage: string | null = null;
  splitTiles: string[] = [];

  // Form group for validation
  form: FormGroup;

  // Properties accessed through the form
  get tilesBaseFileName(): string {
    return this.form.get('tilesBaseFileName')?.value || 'Tile';
  }

  get numTilesX(): number {
    return this.form.get('numTilesX')?.value || 4;
  }

  get numTilesY(): number {
    return this.form.get('numTilesY')?.value || 4;
  }

  get ignoreFirstN(): number {
    return this.form.get('ignoreFirstN')?.value || 0;
  }

  get ignoreLastN(): number {
    return this.form.get('ignoreLastN')?.value || 0;
  }

  private debounceTimer: any;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      numTilesX: [4, [Validators.required, Validators.min(1)]],
      numTilesY: [4, [Validators.required, Validators.min(1)]],
      ignoreFirstN: [0],
      ignoreLastN: [0],
      tilesBaseFileName: ['Tile', [Validators.required, Validators.minLength(1), this.validFilenameValidator]]
    });

    // Subscribe to form value changes to trigger image splitting
    this.form.valueChanges.subscribe(() => {
      this.onSettingsChange();
    });
  }

  // Custom validator for valid filename
  validFilenameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Check for invalid characters in filename
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
    if (invalidChars.test(value)) {
      return {invalidFilename: true};
    }

    // Check if the filename is just whitespace
    if (value.trim() === '') {
      return {blankFilename: true};
    }

    return null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        this.selectedImage = reader.result as string;
        this.splitTiles = [];
        clearTimeout(this.debounceTimer);
        await this.splitImage();
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImage = null;
      this.splitTiles = [];
    }
  }

  async splitImage(): Promise<void> {
    if (!this.selectedImage) {
      console.warn("No image has been selected to split.");
      this.splitTiles = [];
      return;
    }

    try {
      // Load the image using Jimp
      const image = await Jimp.read(this.selectedImage);

      // Calculate the number of tiles in the image
      const tileW = Math.floor(image.bitmap.width / this.numTilesX);
      const tileH = Math.floor(image.bitmap.height / this.numTilesY);
      const totalTiles = this.numTilesX * this.numTilesY;

      // Clear previous tiles
      this.splitTiles = [];

      // Calculate which tiles to include based on ignore settings
      const startTileIndex = this.ignoreFirstN;
      const endTileIndex = totalTiles - this.ignoreLastN;

      // Split the image into tiles
      for (let y = 0; y < this.numTilesY; y++) {
        for (let x = 0; x < this.numTilesX; x++) {
          const tileIndex = y * this.numTilesX + x;

          // Skip tiles based on ignore settings
          if (tileIndex < startTileIndex || tileIndex >= endTileIndex) {
            continue;
          }

          // Crop the tile from the original image
          const options: CropOptions = {
            x: x * tileW,
            y: y * tileH,
            w: tileW,
            h: tileH
          }
          const tile = image.clone().crop(options);

          // Convert the tile to a base64 data URL
          const buffer = await tile.getBuffer("image/png");
          const base64String = buffer.toString('base64');
          const dataUrl = `data:image/png;base64,${base64String}`;

          // Add the tile to the array
          this.splitTiles.push(dataUrl);
        }
      }
    } catch (error) {
      console.error('Error during image splitting:', error);
      this.splitTiles = [];
    }
  }

  onSettingsChange(): void {
    clearTimeout(this.debounceTimer); // Clear any existing timer
    this.debounceTimer = setTimeout(() => {
      if (this.form.valid) {
        this.splitImage();
      }
    }, 1000); // Wait for 1 second (1000 milliseconds)
  }

  async downloadSplitTiles(): Promise<void> {
    if (this.splitTiles.length === 0 || this.form.invalid) {
      console.warn('No split tiles available to download or form is invalid.');
      return;
    }

    try {
      // Create a new JSZip instance
      const zip = new JSZip();

      // Add each tile to the zip file
      for (let i = 0; i < this.splitTiles.length; i++) {
        // Convert data URL to binary
        const dataUrl = this.splitTiles[i];
        const base64Data = dataUrl.split(',')[1];
        const binaryData = atob(base64Data);

        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryData.length);
        for (let j = 0; j < binaryData.length; j++) {
          bytes[j] = binaryData.charCodeAt(j);
        }

        // Add the tile to the zip with a sequential filename
        zip.file(`${this.tilesBaseFileName}_${i.toString().padStart(2, '0')}.png`, bytes);
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({type: 'blob'});

      // Create a download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);

      link.download = `${this.tilesBaseFileName}.zip`;

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error creating zip file:', error);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.debounceTimer);
  }
}
