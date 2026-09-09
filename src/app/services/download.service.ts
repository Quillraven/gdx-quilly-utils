import {Service} from '@angular/core';

interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{description: string; accept: Record<string, string[]>}>;
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface WindowWithSaveFilePicker extends Window {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

@Service()
export class DownloadService {
  async downloadFile(
    blob: Blob,
    filename: string,
    fileType: {description: string; accept: Record<string, string[]>}
  ): Promise<void> {
    // Try the File System Access API first and fall back to a direct download.
    if (!(await this.downloadViaFilePicker(filename, blob, fileType))) {
      this.downloadDirectly(blob, filename);
    }
  }

  async downloadImage(dataUrl: string, filename: string): Promise<void> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await this.downloadFile(blob, filename, {description: 'PNG Image', accept: {'image/png': ['.png']}});
  }

  async downloadZip(zipBlob: Blob, filename: string): Promise<void> {
    await this.downloadFile(zipBlob, filename, {description: 'ZIP Archive', accept: {'application/zip': ['.zip']}});
  }

  private async downloadViaFilePicker(
    suggestedName: string,
    blob: Blob,
    fileType: {description: string; accept: Record<string, string[]>}
  ): Promise<boolean> {
    const windowWithPicker = window as WindowWithSaveFilePicker;
    if (!windowWithPicker.showSaveFilePicker) {
      return false;
    }

    try {
      const fileHandle = await windowWithPicker.showSaveFilePicker({suggestedName, types: [fileType]});
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      // A canceled file picker is not an error, the caller should not fall back to a direct download.
      if (error instanceof Error && error.name === 'AbortError') {
        return true;
      }

      console.error('Error using File System Access API:', error);
      return false;
    }
  }

  private downloadDirectly(blob: Blob, filename: string): void {
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
}