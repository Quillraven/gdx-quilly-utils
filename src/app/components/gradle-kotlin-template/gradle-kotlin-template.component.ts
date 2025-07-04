import {Component} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';
import JSZip from 'jszip';

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
      javaVersion: ['17', Validators.required],
      mainClassName: ['GdxGame', [Validators.required, this.validationService.noSpacesValidator]]
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

      // Load the zip file with JSZip
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(zipBlob);

      // Get form values
      const projectName = this.form.get('projectName')?.value || 'MyGdxGame';
      const mainClassName = this.form.get('mainClassName')?.value || 'GdxGame';

      // Modify the libs.versions.toml file
      const libsVersionsPath = 'gdx-kotlin-template-master/gradle/libs.versions.toml';
      if (zip.files[libsVersionsPath]) {
        // Get the content of the file
        const content = await zip.files[libsVersionsPath].async('text');

        // Remove the specified lines
        const modifiedContent = content
          .split('\n')
          .filter(line =>
            !line.trim().startsWith('fleksVersion') &&
            !line.trim().startsWith('# ecs') &&
            !line.trim().startsWith('fleks = { module'))
          .join('\n');

        // Update the file in the zip
        zip.file(libsVersionsPath, modifiedContent);
      }

      // Find and update files that reference the default main class name
      for (const filePath in zip.files) {
        if (!zip.files[filePath].dir) {
          // Skip directories and binary files
          const extension = filePath.split('.').pop()?.toLowerCase();
          if (extension && ['kt', 'java', 'gradle', 'kts', 'properties', 'xml', 'txt', 'md'].includes(extension)) {
            try {
              const content = await zip.files[filePath].async('text');

              // Replace occurrences of the default class name with the new one
              if (content.includes('GdxGame')) {
                const modifiedContent = content.replace(/GdxGame/g, mainClassName);
                zip.file(filePath, modifiedContent);
              }
            } catch (e) {
              // Skip files that can't be processed as text
              console.warn(`Skipping file ${filePath}: ${e}`);
            }
          }
        }
      }

      // Generate a filename based on the project name
      const filename = `${projectName}.zip`;

      // Generate the modified zip
      const modifiedZipBlob = await zip.generateAsync({ type: 'blob' });

      // Download the modified zip file
      await this.downloadService.downloadZip(modifiedZipBlob, filename);
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
