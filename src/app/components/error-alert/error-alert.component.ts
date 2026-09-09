import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'app-error-alert',
  templateUrl: './error-alert.component.html',
  styleUrl: './error-alert.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorAlertComponent {
  @Input() errorDetails: string | null = null;
}