import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  constructor() {
  }

  /**
   * Attempts to download a file using the File System Access API.
   * @param suggestedName The suggested filename for the download.
   * @param blob The blob to download.
   * @param fileType The file type configuration for the save dialog.
   * @returns A promise that resolves to true if the download was handled (either completed or canceled),
   * or false if the File System Access API is not available or failed.
   */
  async downloadViaFilePicker(
    suggestedName: string,
    blob: Blob,
    fileType: { description: string, accept: Record<string, string[]> }
  ): Promise<boolean> {
    try {
      // Check if the File System Access API is available
      if (!(window as any).showSaveFilePicker) {
        return false;
      }

      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [fileType],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      // If the user cancels the file picker, it throws an AbortError
      // We'll return true to indicate we attempted to use the file picker
      if (error instanceof Error && error.name === 'AbortError') {
        return true;
      }

      console.error('Error using File System Access API:', error);
      return false;
    }
  }

  /**
   * Downloads a file directly using the anchor element approach.
   * @param blob The blob to download.
   * @param filename The filename for the download.
   */
  downloadDirectly(blob: Blob, filename: string): void {
    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(link.href);
  }

  /**
   * Downloads a file, trying the File System Access API first and falling back to direct download.
   * @param blob The blob to download.
   * @param filename The filename for the download.
   * @param fileType The file type configuration for the save dialog.
   */
  async downloadFile(
    blob: Blob,
    filename: string,
    fileType: { description: string, accept: Record<string, string[]> }
  ): Promise<void> {
    try {
      // Try to use showSaveFilePicker API
      const downloaded = await this.downloadViaFilePicker(filename, blob, fileType);
      if (downloaded) {
        // already downloaded via file chooser API or file chooser dialog canceled
        return;
      }

      // download directly without a file chooser
      this.downloadDirectly(blob, filename);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Downloads an image from a data URL.
   * @param dataUrl The data URL of the image.
   * @param filename The filename for the download.
   */
  async downloadImage(dataUrl: string, filename: string): Promise<void> {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Define a file type for PNG images
      const fileType = {
        description: 'PNG Image',
        accept: {'image/png': ['.png']}
      };

      // Download the file
      await this.downloadFile(blob, filename, fileType);
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  /**
   * Downloads a zip file.
   * @param zipBlob The zip blob to download.
   * @param filename The filename for the download.
   */
  async downloadZip(zipBlob: Blob, filename: string): Promise<void> {
    try {
      // Define a file type for ZIP files
      const fileType = {
        description: 'ZIP Archive',
        accept: {'application/zip': ['.zip']}
      };

      // Download the file
      await this.downloadFile(zipBlob, filename, fileType);
    } catch (error) {
      console.error('Error downloading zip file:', error);
      throw error;
    }
  }
}
