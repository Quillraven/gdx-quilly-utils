import {Component, Input} from '@angular/core';
import {AbstractControl, FormControl, ReactiveFormsModule} from '@angular/forms';
import {NgClass} from '@angular/common';
import {ValidationService} from '../../services/validation.service';


function transformInputControl(control: AbstractControl | null): FormControl {
  if (!control) {
    throw new Error('control must be not null for an app-form-field');
  } else if (!(control instanceof AbstractControl)) {
    throw new Error('control must be a FormControl for an app-form-field');
  }

  return control as FormControl;
}

@Component({
  selector: 'app-form-field',
  imports: [
    ReactiveFormsModule,
    NgClass
  ],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css'
})
export class FormFieldComponent {
  @Input({required: true}) label!: string;
  @Input({required: true, alias: 'input-id'}) inputId!: string;
  @Input({required: true}) type!: string;
  @Input({required: true, alias: 'form-control', transform: transformInputControl}) control!: FormControl;

  constructor(private readonly validationService: ValidationService) {
  }

  hasErrors(): boolean {
    return this.control.invalid && (this.control.touched || this.control.dirty);
  }

  errorHint(): string {
    return this.validationService.errorHint(this.control);
  }
}
