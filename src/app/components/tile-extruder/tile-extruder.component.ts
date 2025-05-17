import {Component} from '@angular/core';
import {extrudeTilesetToBuffer} from 'tile-extruder';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';

@Component({
  selector: 'app-tile-extruder',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    ErrorAlertComponent
  ],
  templateUrl: './tile-extruder.component.html',
  styleUrl: './tile-extruder.component.css'
})
export class TileExtruderComponent {
  selectedImage: string | null = null;
  originalFileName: string = '';
  extrudedImageUrl: string | null = null;
  errorDetails: string | null = null;

  // Form group for validation
  form: FormGroup;

  // Properties accessed through the form
  get tileWidth(): number {
    return this.form.get('tileWidth')?.value || 16;
  }

  get tileHeight(): number {
    return this.form.get('tileHeight')?.value || 16;
  }

  get margin(): number {
    return this.form.get('margin')?.value || 0;
  }

  get spacing(): number {
    return this.form.get('spacing')?.value || 0;
  }

  get extrusion(): number {
    return this.form.get('extrusion')?.value || 4;
  }

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      tileWidth: [16, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      tileHeight: [16, [Validators.required, Validators.min(1), this.validationService.integerValidator]],
      margin: [0, [this.validationService.integerValidator]],
      spacing: [0, [this.validationService.integerValidator]],
      extrusion: [4, [Validators.required, Validators.min(1), this.validationService.integerValidator]]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) {
      return;
    }

    const file = input.files[0];
    this.originalFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
      this.extrudedImageUrl = null;
      this.errorDetails = null;
    };
    reader.readAsDataURL(file);
  }

  async extrudeImage(): Promise<void> {
    this.errorDetails = null;
    if (!this.selectedImage) {
      console.warn("No image has been selected to extrude.");
      this.extrudedImageUrl = null;
      return;
    }

    if (this.form.invalid) {
      console.warn("Form is invalid. Please correct the errors.");
      this.extrudedImageUrl = null;
      return;
    }

    try {
      const outputBuffer: Buffer = await extrudeTilesetToBuffer(
        this.tileWidth,
        this.tileHeight,
        this.selectedImage,
        {
          margin: this.margin,
          spacing: this.spacing,
          extrusion: this.extrusion
        }
      )

      // The outputBuffer is a Node.js style Buffer.
      // Convert it to a base64 data URL to display in an <img> tag.
      const base64String = outputBuffer.toString('base64');
      this.extrudedImageUrl = `data:image/png;base64,${base64String}`;
    } catch (error) {
      console.error('Error during tile extrusion:', error);
      this.extrudedImageUrl = null;
      if (error instanceof Error) {
        this.errorDetails = error.message;
      } else {
        this.errorDetails = String(error);
      }
    }
  }

  async downloadExtrudedImage(): Promise<void> {
    if (!this.extrudedImageUrl) {
      console.warn('No extruded image available to download.');
      return;
    }

    try {
      // Suggest a filename
      const nameParts = this.originalFileName.split('.');
      const extension = nameParts.pop();
      const baseName = nameParts.join('.');
      const filename = `${baseName}-extruded.${extension || 'png'}`;

      await this.downloadService.downloadImage(this.extrudedImageUrl, filename);
    } catch (error) {
      console.error('Error downloading extruded image:', error);
      if (error instanceof Error) {
        this.errorDetails = error.message;
      } else {
        this.errorDetails = String(error);
      }
    }
  }

}
