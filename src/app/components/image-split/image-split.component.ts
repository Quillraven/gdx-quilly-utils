import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CropOptions, Jimp} from 'jimp';
import JSZip from 'jszip';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';

@Component({
  selector: 'app-image-split',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ErrorAlertComponent,
    FormFieldComponent
  ],
  templateUrl: './image-split.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './image-split.component.css'
})
export class ImageSplitComponent {
  selectedImage = signal<string | null>(null);
  splitTiles = signal<string[]>([]);
  errorDetails = signal<string | null>(null);
  genTilesX = signal<number>(0);

  // Split mode options
  splitModeOptions: string[] = ['num tiles', 'size'];

  // Form group for validation
  form: FormGroup;

  // Properties accessed through the form
  get tilesBaseFileName(): string {
    return this.form.get('tilesBaseFileName')?.value || 'Tile';
  }

  get splitMode(): string {
    return this.form.get('splitMode')?.value || 'num tiles';
  }

  get numTilesX(): number {
    return this.form.get('numTilesX')?.value || 4;
  }

  get numTilesY(): number {
    return this.form.get('numTilesY')?.value || 4;
  }

  get tileSizeWidth(): number {
    return this.form.get('tileSizeWidth')?.value || 32;
  }

  get tileSizeHeight(): number {
    return this.form.get('tileSizeHeight')?.value || 32;
  }

  get ignoreFirstN(): number {
    return this.form.get('ignoreFirstN')?.value || 0;
  }

  get ignoreLastN(): number {
    return this.form.get('ignoreLastN')?.value || 0;
  }

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      splitMode: ['num tiles', [Validators.required]],
      numTilesX: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      numTilesY: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      tileSizeWidth: [32, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      tileSizeHeight: [32, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      ignoreFirstN: [0, [this.validationService.integerValidator]],
      ignoreLastN: [0, [this.validationService.integerValidator]],
      tilesBaseFileName: ['Tile', [Validators.required, Validators.minLength(1), this.validationService.validFilenameValidator]]
    });
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage.set(reader.result as string);
      this.splitTiles.set([]);
      this.errorDetails.set(null);
    };
    reader.readAsDataURL(file);
  }

  async splitImage(): Promise<void> {
    this.errorDetails.set(null);
    const selectedImage = this.selectedImage();
    if (!selectedImage) {
      console.warn("No image has been selected to split.");
      this.splitTiles.set([]);
      return;
    }

    try {
      // Load the image using Jimp
      const image = await Jimp.read(selectedImage);

      let tileW: number;
      let tileH: number;
      let numTilesX: number;
      let numTilesY: number;

      // Calculate tile dimensions based on the selected split mode
      if (this.splitMode === 'num tiles') {
        // Split by number of tiles (original functionality)
        numTilesX = this.numTilesX;
        numTilesY = this.numTilesY;
        tileW = Math.floor(image.bitmap.width / numTilesX);
        tileH = Math.floor(image.bitmap.height / numTilesY);
      } else {
        // Split by tile size (new functionality)
        tileW = this.tileSizeWidth;
        tileH = this.tileSizeHeight;
        numTilesX = Math.floor(image.bitmap.width / tileW);
        numTilesY = Math.floor(image.bitmap.height / tileH);
      }

      // Store the number of tiles on x-axis for the grid display
      this.genTilesX.set(numTilesX);

      // Calculate total number of tiles
      const totalTiles = numTilesX * numTilesY;

      // Clear previous tiles
      this.splitTiles.set([]);

      // Calculate which tiles to include based on ignored settings
      const startTileIndex = this.ignoreFirstN;
      const endTileIndex = totalTiles - this.ignoreLastN;

      // Split the image into tiles
      for (let y = 0; y < numTilesY; y++) {
        for (let x = 0; x < numTilesX; x++) {
          const tileIndex = y * numTilesX + x;

          // Skip tiles based on ignored settings
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
          this.splitTiles.update(tiles => [...tiles, dataUrl]);
        }
      }
    } catch (error) {
      console.error('Error during image splitting:', error);
      this.splitTiles.set([]);
      if (error instanceof Error) {
        this.errorDetails.set(error.message);
      } else {
        this.errorDetails.set(String(error));
      }
    }
  }

  async downloadSplitTiles(): Promise<void> {
    if (this.splitTiles().length === 0 || this.form.invalid) {
      console.warn('No split tiles available to download or form is invalid.');
      return;
    }

    try {
      // Create a new JSZip instance
      const zip = new JSZip();

      // Add each tile to the zip file
      const splitTiles = this.splitTiles();
      for (let i = 0; i < splitTiles.length; i++) {
        // Convert data URL to binary
        const dataUrl = splitTiles[i];
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
      const filename = `${this.tilesBaseFileName}.zip`;
      const zipBlob = await zip.generateAsync({type: 'blob'});

      // Download the zip file using the service
      await this.downloadService.downloadZip(zipBlob, filename);
    } catch (error) {
      console.error('Error creating zip file:', error);
      if (error instanceof Error) {
        this.errorDetails.set(error.message);
      } else {
        this.errorDetails.set(String(error));
      }
    }
  }
}
