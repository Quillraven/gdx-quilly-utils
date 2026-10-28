import {ChangeDetectionStrategy, Component, Input, signal} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {Jimp} from 'jimp';
import JSZip from 'jszip';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';
import {DropZoneComponent} from '../drop-zone/drop-zone.component';
import {ImagePreviewComponent} from '../image-preview/image-preview.component';
import {
  Anchor,
  ANCHORS,
  Bitmap,
  CharacterFrameExtractorService,
  defaultDirections,
  detectSheetName,
  ExtractResult,
  ExtractSettings,
  findDuplicateKeys,
  SheetGrid,
  sheetKey
} from '../../services/character-frame-extractor.service';

interface SheetEntry {
  id: number;
  fileName: string;
  dataUrl: string;
  bitmap: Bitmap;
  animation: string;
  direction: string;
  rows: number;
}

interface FrameImage {
  name: string;
  index: number;
  dataUrl: string;
  bytes: Uint8Array;
}

interface DirectionRow {
  direction: string;
  frames: FrameImage[];
}

interface AnimationGroup {
  animation: string;
  rows: DirectionRow[];
}

const DIRECTION_NAME = /^[a-z][a-z_]*$/;

@Component({
  selector: 'app-character-extractor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ErrorAlertComponent,
    FormFieldComponent,
    DropZoneComponent,
    ImagePreviewComponent
  ],
  templateUrl: './character-extractor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './character-extractor.component.css'
})
export class CharacterExtractorComponent {
  @Input({required: true}) modeControl!: FormControl;
  @Input({required: true}) modeOptions!: string[];

  sheets = signal<SheetEntry[]>([]);
  result = signal<ExtractResult | null>(null);
  groups = signal<AnimationGroup[]>([]);
  errorDetails = signal<string | null>(null);

  readonly directionCountOptions = ['4', '8'];
  readonly anchorOptions: string[] = ANCHORS;

  form: FormGroup;

  private nextId = 0;

  get outputFileName(): string {
    return this.form.get('outputFileName')?.value || 'frames';
  }

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private extractor: CharacterFrameExtractorService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      directionCount: ['4', [Validators.required]],
      directionOrder: [defaultDirections(4).join(', '), [Validators.required, (c: AbstractControl) => this.directionOrderValidator(c)]],
      frameWidth: [null, [Validators.min(1), this.validationService.integerValidator]],
      anchor: ['bottom-center', [Validators.required]],
      outputFileName: ['frames', [Validators.required, Validators.minLength(1), this.validationService.validFilenameValidator]]
    });

    this.form.get('directionCount')!.valueChanges.subscribe(count => this.onDirectionCountChanged(Number(count)));
    this.form.valueChanges.subscribe(() => this.clearResult());
  }

  get directionCount(): number {
    return Number(this.form.get('directionCount')?.value ?? 4);
  }

  get directions(): string[] {
    return this.parseDirections(this.form.get('directionOrder')?.value ?? '');
  }

  get settings(): ExtractSettings {
    return {
      directions: this.directions,
      frameWidth: this.form.get('frameWidth')?.value || null,
      anchor: this.form.get('anchor')?.value as Anchor
    };
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!(input.files && input.files.length > 0)) return;
    void this.addFiles(Array.from(input.files));
    input.value = '';
  }

  async addFiles(files: File[]): Promise<void> {
    this.errorDetails.set(null);
    this.clearResult();
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    for (const file of sorted) {
      try {
        const dataUrl = await this.readAsDataUrl(file);
        const image = await Jimp.read(dataUrl);
        const bitmap: Bitmap = {
          width: image.bitmap.width,
          height: image.bitmap.height,
          data: new Uint8Array(image.bitmap.data)
        };
        const {animation, direction} = detectSheetName(file.name);
        this.sheets.update(sheets => [...sheets, {
          id: this.nextId++,
          fileName: file.name,
          dataUrl,
          bitmap,
          animation,
          direction,
          rows: direction ? 1 : this.directionCount
        }]);
      } catch (error) {
        console.error('Error reading sheet:', error);
        this.errorDetails.set(`Cannot read ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  removeSheet(id: number): void {
    this.sheets.update(sheets => sheets.filter(s => s.id !== id));
    this.clearResult();
  }

  clearSheets(): void {
    this.sheets.set([]);
    this.errorDetails.set(null);
    this.clearResult();
  }

  updateSheet(id: number, change: Partial<Pick<SheetEntry, 'animation' | 'direction' | 'rows'>>): void {
    this.sheets.update(sheets => sheets.map(s => s.id === id ? {...s, ...change} : s));
    this.clearResult();
  }

  onAnimationInput(id: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.sanitize(input.value);
    this.updateSheet(id, {animation: input.value});
  }

  onDirectionInput(id: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.sanitize(input.value);
    this.updateSheet(id, {direction: input.value});
  }

  onRowsInput(id: number, event: Event): void {
    this.updateSheet(id, {rows: Number((event.target as HTMLInputElement).value)});
  }

  gridOf(sheet: SheetEntry): SheetGrid | string {
    return this.extractor.analyzeSheet(sheet, this.settings);
  }

  gridError(sheet: SheetEntry): string | null {
    const grid = this.gridOf(sheet);
    return typeof grid === 'string' ? grid : null;
  }

  gridInfo(sheet: SheetEntry): string | null {
    const grid = this.gridOf(sheet);
    return typeof grid === 'string' ? null : `${grid.cols} frame(s) per row · ${grid.cellWidth}×${grid.cellHeight} px`;
  }

  duplicateKeys(): string[] {
    return findDuplicateKeys(this.sheets());
  }

  isDuplicate(sheet: SheetEntry): boolean {
    return this.duplicateKeys().includes(sheetKey(sheet.animation, sheet.direction));
  }

  canOptimize(): boolean {
    const sheets = this.sheets();
    return sheets.length > 0
      && this.form.valid
      && sheets.every(s => s.animation !== '' && this.gridError(s) === null)
      && this.duplicateKeys().length === 0;
  }

  async optimize(): Promise<void> {
    this.errorDetails.set(null);
    this.clearResult();
    try {
      const result = this.extractor.extract(this.sheets().map(s => ({...s, name: s.fileName})), this.settings);
      const frames: FrameImage[] = [];
      for (const frame of result.frames) {
        const image = new Jimp({width: frame.width, height: frame.height});
        image.bitmap.data.set(frame.data);
        const buffer = await image.getBuffer('image/png');
        frames.push({name: frame.name, index: frame.index, dataUrl: `data:image/png;base64,${buffer.toString('base64')}`, bytes: new Uint8Array(buffer)});
      }

      const byName = new Map(frames.map(f => [f.name, f]));
      const groups: AnimationGroup[] = [];
      for (const frame of result.frames) {
        let group = groups.find(g => g.animation === frame.animation);
        if (!group) {
          group = {animation: frame.animation, rows: []};
          groups.push(group);
        }
        let row = group.rows.find(r => r.direction === frame.direction);
        if (!row) {
          row = {direction: frame.direction, frames: []};
          group.rows.push(row);
        }
        row.frames.push(byName.get(frame.name)!);
      }

      this.groups.set(groups);
      this.result.set(result);
    } catch (error) {
      console.error('Error during frame extraction:', error);
      this.errorDetails.set(error instanceof Error ? error.message : String(error));
    }
  }

  async downloadFrames(): Promise<void> {
    const groups = this.groups();
    if (groups.length === 0) return;

    try {
      const zip = new JSZip();
      for (const frame of groups.flatMap(g => g.rows.flatMap(r => r.frames))) {
        zip.file(`${frame.name}.png`, frame.bytes);
      }
      const zipBlob = await zip.generateAsync({type: 'blob'});
      await this.downloadService.downloadZip(zipBlob, `${this.outputFileName}.zip`);
    } catch (error) {
      console.error('Error creating zip file:', error);
      this.errorDetails.set(error instanceof Error ? error.message : String(error));
    }
  }

  /** Number of columns of an animation: the frame count of its longest direction row. */
  columnCount(group: AnimationGroup): number {
    return Math.max(...group.rows.map(row => row.frames.length));
  }

  frameCount(group: AnimationGroup): number {
    return group.rows.reduce((sum, row) => sum + row.frames.length, 0);
  }

  private clearResult(): void {
    this.result.set(null);
    this.groups.set([]);
  }

  private onDirectionCountChanged(count: number): void {
    this.form.get('directionOrder')!.setValue(defaultDirections(count).join(', '));
    // sheets with a direction in their name stay single row, all others use the global direction count
    this.sheets.update(sheets => sheets.map(s => s.rows === 1 ? s : {...s, rows: count}));
  }

  private parseDirections(order: string): string[] {
    return order.split(',').map(d => d.trim().toLowerCase()).filter(d => d !== '');
  }

  private directionOrderValidator(control: AbstractControl): ValidationErrors | null {
    const directions = this.parseDirections(control.value ?? '');
    const count = Number(this.form?.get('directionCount')?.value ?? 4);
    if (directions.length !== count) {
      return {invalidDirections: `Enter exactly ${count} comma separated directions`};
    }
    if (directions.some(d => !DIRECTION_NAME.test(d))) {
      return {invalidDirections: 'Directions may only contain letters and underscores'};
    }
    if (new Set(directions).size !== directions.length) {
      return {invalidDirections: 'Directions must be unique'};
    }
    return null;
  }

  private sanitize(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
