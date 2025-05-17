import {Component} from '@angular/core';
import {extrudeTilesetToBuffer} from 'tile-extruder';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-tile-extruder',
  imports: [
    FormsModule
  ],
  templateUrl: './tile-extruder.component.html',
  styleUrl: './tile-extruder.component.css'
})
export class TileExtruderComponent {
  selectedImage: string | null = null;
  originalFileName: string = '';
  extrudedImageUrl: string | null = null;

  tileWidth: number = 16;
  tileHeight: number = 16;
  margin: number = 0;
  spacing: number = 0;
  extrusion: number = 4;

  errorDetails: string | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.originalFileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage = reader.result as string;
        this.extrudedImageUrl = null;
        this.errorDetails = null;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImage = null;
      this.extrudedImageUrl = null;
      this.originalFileName = '';
      this.errorDetails = null;
    }
  }

  async extrudeImage(): Promise<void> {
    this.errorDetails = null;
    if (!this.selectedImage) {
      console.warn("No image has been selected to extrude.");
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

  downloadExtrudedImage(): void {
    if (!this.extrudedImageUrl) {
      console.warn('No extruded image available to download.');
      return;
    }

    // Create a temporary anchor element
    const link = document.createElement('a');

    // Set the href to the data URL of the extruded image
    link.href = this.extrudedImageUrl;

    // Suggest a filename
    const nameParts = this.originalFileName.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    link.download = `${baseName}-extruded.${extension || 'png'}`;

    // Append to the document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

}
