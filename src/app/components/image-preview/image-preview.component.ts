import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  signal,
  viewChild
} from '@angular/core';

export type Zoom = number | 'fit';

@Component({
  selector: 'app-image-preview',
  templateUrl: './image-preview.component.html',
  styleUrl: './image-preview.component.css',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ImagePreviewComponent implements AfterViewInit, OnDestroy {
  @Input({required: true}) src!: string;
  @Input() alt = '';
  @Input() variant: 'full' | 'thumbnail' = 'full';
  @Input() boxed = true;
  @Input() zoom: Zoom = 1;
  @Output() zoomChange = new EventEmitter<Zoom>();

  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly modalStageRef = viewChild<ElementRef<HTMLElement>>('modalStage');

  readonly naturalWidth = signal(0);
  readonly naturalHeight = signal(0);
  readonly fitScale = signal(1);
  readonly modalZoom = signal(1);
  readonly panning = signal(false);

  private resizeObserver: ResizeObserver | null = null;
  private panStartX = 0;
  private panStartY = 0;

  ngAfterViewInit(): void {
    const stage = this.stageRef();
    if (stage) {
      this.resizeObserver = new ResizeObserver(() => this.recomputeFit());
      this.resizeObserver.observe(stage.nativeElement);
    }
    queueMicrotask(() => this.recomputeFit());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onImgLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
    this.naturalHeight.set(img.naturalHeight);
    this.recomputeFit();
  }

  displayZoom(): number {
    return this.zoom === 'fit' ? this.fitScale() : this.zoom;
  }

  displayWidth(): number {
    return Math.round(this.naturalWidth() * this.displayZoom());
  }

  zoomLabel(): string {
    return this.zoom === 'fit' ? 'Fit' : `${Math.round(this.zoom * 100)}%`;
  }

  zoomIn(): void {
    this.emitZoom(this.clamp(this.zoomBase() * 2));
  }

  zoomOut(): void {
    this.emitZoom(this.clamp(this.zoomBase() * 0.5));
  }

  setZoom(zoom: Zoom): void {
    this.emitZoom(zoom);
  }

  openModal(): void {
    this.modalZoom.set(1);
    const dialog = this.dialogRef();
    if (!dialog) return;
    if (!dialog.nativeElement.open) {
      dialog.nativeElement.showModal();
    }
    requestAnimationFrame(() => this.centerModal());
  }

  closeModal(): void {
    this.dialogRef()?.nativeElement.close();
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  modalWidth(): number {
    return Math.round(this.naturalWidth() * this.modalZoom());
  }

  onModalWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.modalZoom.update(zoom => Math.min(8, Math.max(0.5, zoom * factor)));
  }

  onPanStart(event: PointerEvent): void {
    this.panning.set(true);
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPanMove(event: PointerEvent): void {
    if (!this.panning()) return;
    const element = event.currentTarget as HTMLElement;
    const dx = event.clientX - this.panStartX;
    const dy = event.clientY - this.panStartY;
    element.scrollBy(-dx, -dy);
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
  }

  onPanEnd(): void {
    this.panning.set(false);
  }

  private zoomBase(): number {
    return this.zoom === 'fit' ? this.fitScale() : this.zoom;
  }

  private emitZoom(zoom: Zoom): void {
    this.zoomChange.emit(zoom);
  }

  private clamp(zoom: number): number {
    return Math.min(8, Math.max(0.1, zoom));
  }

  private recomputeFit(): void {
    const stage = this.stageRef();
    if (!stage || this.naturalWidth() === 0 || this.naturalHeight() === 0) return;
    const element = stage.nativeElement;
    const scale = Math.min(
      element.clientWidth / this.naturalWidth(),
      element.clientHeight / this.naturalHeight(),
      1
    );
    this.fitScale.set(scale > 0 ? scale : 1);
  }

  private centerModal(): void {
    const stage = this.modalStageRef();
    if (!stage) return;
    const element = stage.nativeElement;
    element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
  }
}