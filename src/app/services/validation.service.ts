import {Injectable} from '@angular/core';
import {AbstractControl, ValidationErrors} from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  /**
   * Validates that a value does not contain spaces.
   * @param control The form control to validate
   * @returns ValidationErrors or null if valid
   */
  noSpacesValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (/\s/.test(value)) {
      return {containsSpaces: true};
    }

    return null;
  }

  /**
   * Validates that a value is a valid Java package name.
   * @param control The form control to validate
   * @returns ValidationErrors or null if valid
   */
  packageNameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Package name should be in the format: com.example.myapp
    const packageRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
    if (!packageRegex.test(value)) {
      return {invalidPackageName: true};
    }

    return null;
  }

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

    if (!Number.isInteger(value)) {
      return {notAnInteger: true};
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
      return {invalidFilename: true};
    }

    // Check if the filename is just whitespace
    if (value.trim() === '') {
      return {blankFilename: true};
    }

    return null;
  }

  validKotlinVersionValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const versionRegex = /^\d+\.\d+(?:\.\d+)?(?:-(?i:M\d+|alpha|beta|rc|eap)\d*)?$/
    if (!versionRegex.test(value)) {
      return {invalidKotlinVersion: true};
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
    } else if (errors['containsSpaces']) {
      return 'Value cannot contain spaces';
    } else if (errors['invalidPackageName']) {
      return 'Value is not a valid package name. Format should be: com.example.myapp';
    } else if (errors['invalidKotlinVersion']) {
      return "Value is not a valid Kotlin version";
    }

    return 'Unknown error';
  }
}
