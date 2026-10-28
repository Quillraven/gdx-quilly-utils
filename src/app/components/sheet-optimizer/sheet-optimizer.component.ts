import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {CharacterExtractorComponent} from '../character-extractor/character-extractor.component';
import {SingleSheetOptimizerComponent} from '../single-sheet-optimizer/single-sheet-optimizer.component';

const CHARACTER_MODE = 'Character (multi-sheet)';
const SINGLE_MODE = 'Single sheet';

@Component({
  selector: 'app-sheet-optimizer',
  imports: [CharacterExtractorComponent, SingleSheetOptimizerComponent],
  templateUrl: './sheet-optimizer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sheet-optimizer.component.css'
})
export class SheetOptimizerComponent {
  readonly modeOptions = [CHARACTER_MODE, SINGLE_MODE];
  readonly modeControl = new FormControl(CHARACTER_MODE, {nonNullable: true});
  readonly mode = toSignal(this.modeControl.valueChanges, {initialValue: this.modeControl.value});
  readonly characterMode = CHARACTER_MODE;

  readonly characterPoints = [
    'Upload all sheets, animation and direction are detected from the file names',
    'Rows are directions (4 or 8), or the direction is part of the file name',
    'Sheets with different frame sizes are aligned by an anchor',
    'Frames like walk_down_1 as a flat ZIP'
  ];
  readonly singlePoints = [
    'Enter the number of columns and rows',
    'All frames are cropped to one common box',
    'Optimized sheet with its frame dimensions'
  ];
}
