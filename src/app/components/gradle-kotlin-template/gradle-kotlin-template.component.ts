import {Component} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {ErrorAlertComponent} from '../error-alert/error-alert.component';
import {DownloadService} from '../../services/download.service';
import {ValidationService} from '../../services/validation.service';
import {FormFieldComponent} from '../form-field/form-field.component';
import JSZip from 'jszip';

const FILES_TO_UPDATE = ['kt', 'kts', 'md'];
const LINE_ENDING = '\n';

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

  // Java version options for the radio buttons
  javaVersionOptions: string[] = ['8', '11', '17', '21', '24'];

  constructor(
    private fb: FormBuilder,
    private downloadService: DownloadService,
    private validationService: ValidationService
  ) {
    this.form = this.fb.group({
      projectName: ['MyGdxGame', [Validators.required, this.validationService.noSpacesValidator]],
      packageName: ['io.github', [Validators.required, this.validationService.packageNameValidator]],
      javaVersion: ['17', Validators.required],
      mainClassName: ['GdxGame', [Validators.required, this.validationService.noSpacesValidator]],
      // launcher options
      desktopLauncher: [true],
      teaVmLauncher: [false],
      // dependency options
      gdxAiDep: [false],
      fleksDep: [true],
      b2dDep: [true],
      freetypeDep: [true],
      ktxTiledDep: [true],
      ktxPrefsDep: [false],
      ktxI18nDep: [false],
    });
  }

  async downloadTemplate(): Promise<void> {
    this.errorDetails = null;

    if (this.form.invalid) {
      this.errorDetails = "Form is invalid. Please correct the errors.";
      return;
    }

    const desktopLauncher: boolean = this.form.get('desktopLauncher')?.value === true;
    const teaVmLauncher: boolean = this.form.get('teaVmLauncher')?.value === true;
    if (!desktopLauncher && !teaVmLauncher) {
      this.errorDetails = "Please select at least one launcher option";
      return;
    }

    try {
      // URL to the template zip file in public folder
      const templateUrl = 'gdx-kotlin-template-master.zip';

      // Fetch the template zip file
      const response = await fetch(templateUrl);
      if (!response.ok) {
        this.errorDetails = `Failed to fetch template: ${response.statusText}`;
        return;
      }
      const zipBlob = await response.blob();

      // Load the zip file with JSZip
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(zipBlob);

      // Get form values
      const projectName = this.form.get('projectName')?.value || 'MyGdxGame';

      // 1. update file content without structural changes
      await this.updateVersionCatalog(zip);
      await this.updateDependencies(zip, projectName);
      await this.updateMainClass(zip);

      // 2. update structure
      await this.updatePackageName(zip);
      await this.updateRootFolderName(zip, projectName);

      // Generate a filename based on the project name
      const filename = `${projectName}.zip`;

      // Generate the modified zip
      const modifiedZipBlob = await zip.generateAsync({type: 'blob'});

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

  private async updateRootFolderName(zip: JSZip, projectName: string) {
    const oldPath = "gdx-kotlin-template-master/";
    const newPath = `${projectName}/`;
    if (oldPath === newPath) {
      return;
    }

    const filesToMove = [];

    // Ensure the paths end with a slash to correctly identify folder contents
    const oldFolder = oldPath.endsWith('/') ? oldPath : oldPath + '/';
    const newFolder = newPath.endsWith('/') ? newPath : newPath + '/';

    // Find all files and folders under the old path
    for (const filePath in zip.files) {
      if (filePath.startsWith(oldFolder)) {
        filesToMove.push(filePath);
      }
    }

    // Create new files and folders with the new path
    for (const filePath of filesToMove) {
      const file = zip.files[filePath];
      const newFilePath = filePath.replace(oldFolder, newFolder);

      if (file.dir) {
        zip.folder(newFilePath);
      } else {
        const content = await file.async('arraybuffer');
        zip.file(newFilePath, content);
      }
    }

    // Remove the old files and folders
    for (const filePath of filesToMove) {
      zip.remove(filePath);
    }
  }

  private async updateMainClass(zip: JSZip) {
    const defaultMainClass = 'GdxGame';
    const mainClassName = this.form.get('mainClassName')?.value || 'GdxGame';
    if (defaultMainClass === mainClassName) {
      // nothing to do because main class name remains the same
      return;
    }

    // Find and update files that reference the default main class name
    let mainClassFileToRemove = null;
    for (const filePath in zip.files) {
      if (zip.files[filePath].dir) {
        // ignore directories
        continue;
      }

      const extension = filePath.split('.').pop()?.toLowerCase();
      if (!(extension && FILES_TO_UPDATE.includes(extension))) {
        continue;
      }

      try {
        const content = await zip.files[filePath].async('text');

        // Replace occurrences of the default class name with the new one
        if (content.includes(defaultMainClass)) {
          const modifiedContent = content.replace(new RegExp(defaultMainClass, 'g'), mainClassName);
          zip.file(filePath, modifiedContent);
        }

        // Rename the main class file if found
        if (filePath.endsWith(`/${defaultMainClass}.kt`)) {
          const newPath = filePath.replace(`/${defaultMainClass}.kt`, `/${mainClassName}.kt`);
          zip.file(newPath, content.replace(new RegExp(defaultMainClass, 'g'), mainClassName));
          mainClassFileToRemove = filePath;
        }
      } catch (e) {
        throw new Error(`Skipping file ${filePath}: ${e}`);
      }
    }

    if (mainClassFileToRemove) {
      zip.remove(mainClassFileToRemove);
    }
  }

  private async updatePackageName(zip: JSZip) {
    const packageName = this.form.get('packageName')?.value || 'io.github';
    const defaultPackage = 'io.github';
    if (defaultPackage === packageName) {
      // nothing to do because package remains the same
      return
    }

    const defaultPackagePath = defaultPackage.replace(/\./g, '/');
    const newPackagePath = packageName.replace(/\./g, '/');
    const foldersToRemove = [];
    const filesToProcess = [];

    // Find and update files that reference the default package name
    for (const filePath in zip.files) {
      if (zip.files[filePath].dir) {
        if (filePath.includes(`/kotlin/io/`)) {
          // remove original io.github folders
          foldersToRemove.push(filePath);
        }
        continue;
      }

      const extension = filePath.split('.').pop()?.toLowerCase();
      if (extension && FILES_TO_UPDATE.includes(extension)) {
        filesToProcess.push(filePath);
      }
    }

    const filesToRemove = [];
    for (const filePath of filesToProcess) {
      try {
        const content = await zip.files[filePath].async('text');

        // Replace package declarations, imports and usage in gradle files like group or main class definition
        let modifiedContent = content;
        if (content.includes(defaultPackage)) {
          modifiedContent = content.replace(new RegExp(`package\\s+${defaultPackage}`, 'g'), `package ${packageName}`);
          modifiedContent = modifiedContent.replace(new RegExp(`import\\s+${defaultPackage}\\.`, 'g'), `import ${packageName}.`);
          modifiedContent = modifiedContent.replace(new RegExp(`"${defaultPackage}`, 'g'), `"${packageName}`);
        }

        // Rename package directories if they match the pattern
        if (filePath.includes(`/kotlin/${defaultPackagePath}/`)) {
          const newPath = filePath.replace(`/kotlin/${defaultPackagePath}/`, `/kotlin/${newPackagePath}/`);

          // Create the new directory structure if needed
          const dirParts = newPath.split('/');
          let currentPath = '';
          for (let i = 0; i < dirParts.length - 1; i++) {
            currentPath += dirParts[i] + '/';
            if (!zip.files[currentPath]) {
              zip.folder(currentPath);
            }
          }

          // Add the file to the new path
          zip.file(newPath, modifiedContent);

          // Mark the old file for removal
          // We'll remove it after processing all files to avoid issues with iteration
          if (newPath !== filePath) {
            filesToRemove.push(filePath);
          }
        } else {
          // update existing file in place
          zip.file(filePath, modifiedContent);
        }
      } catch (e) {
        throw new Error(`Skipping file ${filePath}: ${e}`);
      }
    }

    // Remove the old files and folders
    for (const filePath of [...filesToRemove, ...foldersToRemove]) {
      zip.remove(filePath);
    }
  }

  private async updateVersionCatalog(zip: JSZip) {
    const javaVersion = this.form.get('javaVersion')?.value || '17';
    const gdxAi: boolean = this.form.get('gdxAiDep')?.value === true;
    const fleksDep: boolean = this.form.get('fleksDep')?.value === true;
    const b2dDep: boolean = this.form.get('b2dDep')?.value === true;
    const freetypeDep: boolean = this.form.get('freetypeDep')?.value === true;
    const ktxTiledDep: boolean = this.form.get('ktxTiledDep')?.value === true;
    const ktxPrefsDep: boolean = this.form.get('ktxPrefsDep')?.value === true;
    const ktxI18nDep: boolean = this.form.get('ktxI18nDep')?.value === true;
    const desktopLauncher: boolean = this.form.get('desktopLauncher')?.value === true;
    const teaVmLauncher: boolean = this.form.get('teaVmLauncher')?.value === true;

    // Find the libs.versions.toml file
    for (const filePath in zip.files) {
      if (!filePath.endsWith('/gradle/libs.versions.toml') || zip.files[filePath].dir) {
        continue;
      }

      try {
        const content = await zip.files[filePath].async('text');

        // Update the jvmToolchainVersion
        let modifiedContent = content.replace(
          /jvmToolchainVersion\s*=\s*["'](\d+)["']/,
          `jvmToolchainVersion = "${javaVersion}"`
        );

        // keep GDX-AI ?
        if (!gdxAi) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('gdxAi') &&
              !line.startsWith('# ai') &&
              !line.startsWith('aiBundle') &&
              !line.startsWith('ktxAi'))
            .join(LINE_ENDING);
        }

        // keep Fleks ECS ?
        if (!fleksDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('fleks') &&
              !line.startsWith('# ecs'))
            .join(LINE_ENDING);
        }

        // keep Box2D ?
        if (!b2dDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('gdxBox2d') &&
              !line.startsWith('# box2d') &&
              !line.startsWith('ktxBox2d') &&
              !line.startsWith('box2dBundle'))
            .join(LINE_ENDING);
        }

        // keep freetype ?
        if (!freetypeDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('gdxFreetype') &&
              !line.startsWith('# freetype') &&
              !line.startsWith('ktxFreetype') &&
              !line.startsWith('gdxTeaVmFreetype') &&
              !line.startsWith('freetypeBundle'))
            .join(LINE_ENDING);
        }

        // keep ktx tiled ?
        if (!ktxTiledDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('ktxTiled'))
            .join(LINE_ENDING);
        }

        // keep ktx preferences ?
        if (!ktxPrefsDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('ktxPreferences'))
            .join(LINE_ENDING);
        }

        // keep ktx i18n ?
        if (!ktxPrefsDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('ktxI18n'))
            .join(LINE_ENDING);
        }

        // remove other ktx extension comment if necessary
        if (!ktxTiledDep && !ktxPrefsDep && !ktxI18nDep) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('# other ktx'))
            .join(LINE_ENDING);
        }

        // keep desktop launcher ?
        if (!desktopLauncher) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('gdxBackendLwjgl3') &&
              !line.startsWith('gdxPlatform'))
            .join(LINE_ENDING);
        }

        // keep teavm launcher ?
        if (!teaVmLauncher) {
          modifiedContent = modifiedContent
            .split(LINE_ENDING)
            .filter(line =>
              !line.startsWith('gretty') &&
              !line.startsWith('gdxTeaVm') &&
              !line.startsWith('gdxBox2dGwt') &&
              !line.startsWith('teaVm') &&
              !line.startsWith('# teavm') &&
              !line.startsWith('[plugins]'))
            .join(LINE_ENDING);
        }

        // Update the file in the zip
        zip.file(filePath, modifiedContent);
      } catch (e) {
        throw new Error(`Error updating Java version in ${filePath}: ${e}`);
      }

      // file found and updated -> end loop
      return;
    }
  }

  private async updateDependencies(zip: JSZip, projectName: string) {
    const desktopLauncher: boolean = this.form.get('desktopLauncher')?.value === true;
    const teaVmLauncher: boolean = this.form.get('teaVmLauncher')?.value === true;

    const filesToRemove = [];

    for (const filePath in zip.files) {
      try {
        if (filePath.endsWith('/core/build.gradle.kts')) {
          await this.updateCoreBuildGradle(zip, filePath)
          continue;
        }

        if (filePath.endsWith('/settings.gradle.kts') && !filePath.includes('buildSrc')) {
          await this.updateRootSettingsGradle(zip, filePath, projectName)
          continue;
        }

        if (!desktopLauncher && filePath.includes('lwjgl3')) {
          filesToRemove.push(filePath);
          continue;
        } else if (desktopLauncher && filePath.endsWith('/lwjgl3/build.gradle.kts')) {
          await this.updateDesktopBuildGradle(zip, filePath)
          continue;
        }

        if (!teaVmLauncher && filePath.includes('teavm')) {
          filesToRemove.push(filePath);
        } else if (teaVmLauncher && filePath.endsWith('/teavm/build.gradle.kts')) {
          await this.updateTeaVmBuildGradle(zip, filePath)
        } else if (teaVmLauncher && filePath.endsWith('/TeaVMLauncher.kt')) {
          await this.updateTeaVmLauncher(zip, filePath)
        }
      } catch (e) {
        throw new Error(`Error updating Java version in ${filePath}: ${e}`);
      }
    }

    for (let filePath of filesToRemove) {
      zip.remove(filePath);
    }
  }

  private async updateCoreBuildGradle(zip: JSZip, filePath: string) {
    const gdxAi: boolean = this.form.get('gdxAiDep')?.value === true;
    const fleksDep: boolean = this.form.get('fleksDep')?.value === true;
    const b2dDep: boolean = this.form.get('b2dDep')?.value === true;
    const freetypeDep: boolean = this.form.get('freetypeDep')?.value === true;
    const ktxTiledDep: boolean = this.form.get('ktxTiledDep')?.value === true;
    const ktxPrefsDep: boolean = this.form.get('ktxPrefsDep')?.value === true;
    const ktxI18nDep: boolean = this.form.get('ktxI18nDep')?.value === true;

    let modifiedContent = await zip.files[filePath].async('text');

    if (!b2dDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('box2d'))
        .join(LINE_ENDING);
    }

    if (!freetypeDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('freetype'))
        .join(LINE_ENDING);
    }

    if (!gdxAi) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('aiBundle'))
        .join(LINE_ENDING);
    }

    if (!ktxTiledDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('ktxTiled'))
        .join(LINE_ENDING);
    }

    if (!ktxPrefsDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('ktxPreferences'))
        .join(LINE_ENDING);
    }

    if (!ktxI18nDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('ktxI18n'))
        .join(LINE_ENDING);
    }

    if (!fleksDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('fleks'))
        .join(LINE_ENDING);
    }

    zip.file(filePath, modifiedContent);
  }

  private async updateRootSettingsGradle(zip: JSZip, filePath: string, projectName: string) {
    const fleksDep: boolean = this.form.get('fleksDep')?.value === true;
    const desktopLauncher: boolean = this.form.get('desktopLauncher')?.value === true;
    const teaVmLauncher: boolean = this.form.get('teaVmLauncher')?.value === true;

    const content = await zip.files[filePath].async('text');
    let modifiedContent = content.replace(new RegExp("gdx-template", 'g'), projectName);

    if (!desktopLauncher) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('lwjgl3'))
        .join(LINE_ENDING);
    }

    if (!teaVmLauncher) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('teavm') &&
          !line.includes('TeaVM') &&
          !line.includes('jitpack'))
        .join(LINE_ENDING);
    }

    if (!fleksDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('Fleks') &&
          !line.includes('s01.oss.sonatype'))
        .join(LINE_ENDING);
    }

    zip.file(filePath, modifiedContent);
  }

  private async updateDesktopBuildGradle(zip: JSZip, filePath: string) {
    const b2dDep: boolean = this.form.get('b2dDep')?.value === true;
    const freetypeDep: boolean = this.form.get('freetypeDep')?.value === true;

    let modifiedContent = await zip.files[filePath].async('text');

    if (!b2dDep) {
      const lines = modifiedContent.split(LINE_ENDING);
      const newContent = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Box2d')) {
          i += 2;
          continue;
        }

        newContent.push(line);
      }
      modifiedContent = newContent.join(LINE_ENDING);
    }

    if (!freetypeDep) {
      const lines = modifiedContent.split(LINE_ENDING);
      const newContent = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Freetype')) {
          i += 2;
          continue;
        }

        newContent.push(line);
      }
      modifiedContent = newContent.join(LINE_ENDING);
    }

    zip.file(filePath, modifiedContent);
  }

  private async updateTeaVmBuildGradle(zip: JSZip, filePath: string) {
    const b2dDep: boolean = this.form.get('b2dDep')?.value === true;
    const freetypeDep: boolean = this.form.get('freetypeDep')?.value === true;

    let modifiedContent = await zip.files[filePath].async('text');

    if (!b2dDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('Box2d'))
        .join(LINE_ENDING);
    }

    if (!freetypeDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('Freetype'))
        .join(LINE_ENDING);
    }

    zip.file(filePath, modifiedContent);
  }

  private async updateTeaVmLauncher(zip: JSZip, filePath: string) {
    const freetypeDep: boolean = this.form.get('freetypeDep')?.value === true;

    let modifiedContent = await zip.files[filePath].async('text');

    if (!freetypeDep) {
      modifiedContent = modifiedContent
        .split(LINE_ENDING)
        .filter(line => !line.includes('TeaAssetPreloadListener') &&
          !line.includes('freetype'))
        .join(LINE_ENDING);
    }

    zip.file(filePath, modifiedContent);
  }
}
