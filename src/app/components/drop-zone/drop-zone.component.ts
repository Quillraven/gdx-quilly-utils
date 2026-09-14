import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal} from '@angular/core';

@Component({
  selector: 'app-drop-zone',
  templateUrl: './drop-zone.component.html',
  styleUrl: './drop-zone.component.css',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DropZoneComponent {
  @Input() empty = false;
  @Input() multiple = false;
  @Input({required: true}) dropTitle!: string;
  @Input() dropHint = 'or use the upload button';
  @Input() overlayText = 'Drop to replace';
  @Output() filesDropped = new EventEmitter<File[]>();

  readonly dragActive = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types.includes('Files')) {
      this.dragActive.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement | null;
    if (target && !target.contains(event.relatedTarget as Node)) {
      this.dragActive.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);
    if (!event.dataTransfer?.types.includes('Files')) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    const droppedFiles = this.multiple ? files : files.slice(0, 1);
    if (droppedFiles.length > 0) {
      this.filesDropped.emit(droppedFiles);
    }
  }
}