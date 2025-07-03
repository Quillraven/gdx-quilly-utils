import {Injectable} from '@angular/core';
import {AbstractControl, ValidationErrors} from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  /**
   * Validates that a value is an integer.
   * @param control The form control to validate
   * @returns ValidationErrors or null if valid
   */
  integerValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const isInt = /^-?\d+$/.test(String(value));
    if (!isInt) {
      return { notAnInteger: true };
    }

    return null;
  }

  /**
   * Validates that a value is a valid filename.
   * @param control The form control to validate
   * @returns ValidationErrors or null if valid
   */
  validFilenameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Check for invalid characters in the filename
    const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/;
    if (invalidChars.test(value)) {
      return { invalidFilename: true };
    }

    // Check if the filename is just whitespace
    if (value.trim() === '') {
      return { blankFilename: true };
    }

    return null;
  }

  errorHint(control: AbstractControl): string {
    const errors = control.errors;
    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return 'This field is mandatory';
    } else if (errors['min']) {
      return 'Value must be greater than ' + errors['min'].min;
    } else if (errors['notAnInteger']) {
      return 'Value must be an integer';
    } else if (errors['minLength']) {
      return 'Value must be at least ' + errors['minLength'] + " characters long";
    } else if (errors['invalidFilename']) {
      return 'Value is not a valid file name. Cannot contain: < > : " / \\ | ? *';
    } else if (errors['blankFilename']) {
      return 'File name cannot be empty';
    }

    return 'Unknown error';
  }
}
