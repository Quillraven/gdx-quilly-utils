import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  templateUrl: './error-alert.component.html',
  styleUrls: ['./error-alert.component.css'],
  standalone: true
})
export class ErrorAlertComponent {
  @Input() errorDetails: string = '';
}
