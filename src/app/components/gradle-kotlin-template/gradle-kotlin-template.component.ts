import {Component} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';
import * as JSZip from 'jszip';

@Component({
  selector: 'app-gradle-kotlin-template',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    ErrorAlertComponent,
    FormFieldComponent
  ],
  templateUrl: './gradle-kotlin-template.component.html',
  styleUrl: './gradle-kotlin-template.component.css'
})
export class GradleKotlinTemplateComponent {
  errorDetails: string | null = null;

  // Form group for validation
  form: FormGroup;

  // Java version options for the dropdown
  javaVersionOptions = [
    { value: '8', label: 'Java 8' },
    { value: '11', label: 'Java 11' },
    { value: '17', label: 'Java 17' },
    { value: '21', label: 'Java 21' }
  ];

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      projectName: ['MyGdxGame', [Validators.required, this.validationService.noSpacesValidator]],
      packageName: ['com.example.game', [Validators.required, this.validationService.packageNameValidator]],
      javaVersion: ['17', Validators.required]
    });
  }

  async downloadTemplate(): Promise<void> {
    this.errorDetails = null;

    if (this.form.invalid) {
      console.warn("Form is invalid. Please correct the errors.");
      return;
    }

    try {
      // URL to the template zip file in public folder
      const templateUrl = 'gdx-kotlin-template-master.zip';

      // Fetch the template zip file
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const zipBlob = await response.blob();

      // Generate a filename based on the project name
      const projectName = this.form.get('projectName')?.value || 'MyGdxGame';
      const filename = `${projectName}.zip`;

      // Download the zip file
      await this.downloadService.downloadZip(zipBlob, filename);
    } catch (error) {
      console.error('Error downloading template:', error);
      if (error instanceof Error) {
        this.errorDetails = error.message;
      } else {
        this.errorDetails = String(error);
      }
    }
  }
}
