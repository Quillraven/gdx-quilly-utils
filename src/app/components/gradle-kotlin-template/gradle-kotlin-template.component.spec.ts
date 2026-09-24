/// <reference types="vitest/globals" />
import {TestBed} from '@angular/core/testing';
import JSZip from 'jszip';
import {GradleKotlinTemplateComponent} from './gradle-kotlin-template.component';
import {DownloadService} from '../../services/download.service';

const ROOT = 'gdx-kotlin-template-master/';

function dir(zip: JSZip, path: string): void {
  zip.folder(path);
}

function add(zip: JSZip, path: string, content: string): void {
  zip.file(path, content);
}

function buildTemplateZip(): JSZip {
  const zip = new JSZip();

  add(zip, `${ROOT}build.gradle.kts`, `plugins {
    alias(libs.plugins.kotlinJvm) apply false
    alias(libs.plugins.kotlinSerialization) apply false
}
`);

  add(zip, `${ROOT}settings.gradle.kts`, `pluginManagement {
    includeBuild("build-logic")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    @Suppress("UnstableApiUsage")
    repositories {
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

include(":core")
include(":lwjgl3")
include(":teavm")
include(":tool")

rootProject.name = "gdx-template"
`);

  add(zip, `${ROOT}gradle/libs.versions.toml`, `[versions]
jvmToolchainVersion = "25"
kotlinVersion = "2.4.20"
gdxVersion = "1.14.2"
gdxControllersVersion = "2.2.4"

[libraries]
kotlinGradlePlugin = { module = "org.jetbrains.kotlin:kotlin-gradle-plugin", version.ref = "kotlinVersion" }
#gdx base
gdx = { module = "com.badlogicgames.gdx:gdx", version.ref = "gdxVersion" }
gdxTools = { module = "com.badlogicgames.gdx:gdx-tools", version.ref = "gdxVersion" }
# gdx controllers
gdxControllersCore = { module = "com.badlogicgames.gdx-controllers:gdx-controllers-core", version.ref = "gdxControllersVersion" }
gdxTeaVmControllers = { module = "com.github.xpenatan.gdx-teavm:gdx-controllers-web", version.ref = "gdxControllersVersion" }
gdxControllersDesktop = { module = "com.badlogicgames.gdx-controllers:gdx-controllers-desktop", version.ref = "gdxControllersVersion" }

[plugins]
kotlinJvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlinVersion" }
kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlinVersion" }
`);

  add(zip, `${ROOT}gradle.properties`, `org.gradle.caching=true
org.gradle.configuration-cache=true
`);

  add(zip, `${ROOT}README.md`, `# Gdx Kotlin Template

The \`tool\` module is meant for project related tools.
`);

  add(zip, `${ROOT}core/build.gradle.kts`, `plugins {
    id("kotlin-jvm")
    alias(libs.plugins.kotlinSerialization)
}

sourceSets {
    main {
        resources.srcDir(rootProject.files("assets"))
    }
}

dependencies {
    api(libs.gdx)
    api(libs.bundles.ktxBaseBundle)
    api(libs.kotlinxSerializationJson)
    implementation(libs.bundles.box2dBundle)
    implementation(libs.bundles.freetypeBundle)
    implementation(libs.bundles.aiBundle)
    implementation(libs.ktxTiled)
    implementation(libs.ktxPreferences)
    implementation(libs.ktxI18n)
    implementation(libs.fleks)
    implementation(libs.textraTypist)
    implementation(libs.freeTypist)
    implementation(libs.gdxControllersCore)

    testImplementation(kotlin("test"))
}
`);

  add(zip, `${ROOT}core/src/main/kotlin/io/github/GdxGame.kt`, `package io.github

import com.badlogic.gdx.Game

class GdxGame : Game() {
    override fun create() {
    }
}
`);

  add(zip, `${ROOT}lwjgl3/build.gradle.kts`, `group = "io.github"
version = "1.0"

dependencies {
    implementation(libs.gdxControllersDesktop)
}

application {
    applicationName = "GdxGame"
    mainClass = "io.github.Lwjgl3LauncherKt"
}
`);

  add(zip, `${ROOT}lwjgl3/src/main/kotlin/io/github/Lwjgl3Launcher.kt`, `package io.github

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration

fun main() {
    Lwjgl3Application(GdxGame(), Lwjgl3ApplicationConfiguration().apply {
        setTitle("GdxGame")
    })
}
`);

  add(zip, `${ROOT}teavm/build.gradle.kts`, `plugins {
    id("kotlin-jvm")
    alias(libs.plugins.gdxTeaVmPlugin)
}

dependencies {
    implementation(libs.gdxTeaVmControllers)
    implementation(project(":core"))
}

gdxTeaVM {
    webDefaults {
        mainClass.set("io.github.TeaVMLauncherKt")
    }
}
`);

  add(zip, `${ROOT}teavm/src/main/kotlin/io/github/TeaVMLauncher.kt`, `package io.github

import com.github.xpenatan.gdx.teavm.backends.web.WebApplication
import com.github.xpenatan.gdx.teavm.backends.web.WebApplicationConfiguration

fun main() {
    WebApplication(GdxGame(), WebApplicationConfiguration("canvas"))
}
`);

  dir(zip, `${ROOT}tool/`);
  add(zip, `${ROOT}tool/build.gradle.kts`, `plugins {
    id("kotlin-jvm")
}

dependencies {
    implementation(libs.gdxTools)
}

tasks.register<JavaExec>("packTextures") {
    group = rootProject.name
    description = "Packs textures of the assets folder into texture atlases"

    mainClass.set("io.github.TexturePackerKt")
    classpath = sourceSets.main.get().runtimeClasspath
}
`);
  add(zip, `${ROOT}tool/src/main/kotlin/io/github/texturePacker.kt`, `package io.github

import com.badlogic.gdx.tools.texturepacker.TexturePacker

fun main() {
    val settings = TexturePacker.Settings()
    TexturePacker.process(settings, "input", "output", "sprites")
}
`);

  return zip;
}

async function buildTemplateBlob(): Promise<Blob> {
  const zip = buildTemplateZip();
  return zip.generateAsync({type: 'blob'});
}

function findFileBySuffix(zip: JSZip, suffix: string): string | null {
  for (const filePath in zip.files) {
    if (zip.files[filePath].dir) {
      continue;
    }
    if (filePath.endsWith(suffix)) {
      return filePath;
    }
  }
  return null;
}

async function fileContent(zip: JSZip, suffix: string): Promise<string | null> {
  const filePath = findFileBySuffix(zip, suffix);
  if (!filePath) {
    return null;
  }
  return zip.files[filePath].async('text');
}

describe('GradleKotlinTemplateComponent', () => {
  let templateBlob: Blob;
  let downloadSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    templateBlob = await buildTemplateBlob();
  });

  beforeEach(() => {
    downloadSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, blob: async () => templateBlob}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function createComponent(): Promise<GradleKotlinTemplateComponent> {
    await TestBed.configureTestingModule({
      imports: [GradleKotlinTemplateComponent],
      providers: [
        {provide: DownloadService, useValue: {downloadZip: downloadSpy}}
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(GradleKotlinTemplateComponent);
    return fixture.componentInstance;
  }

  it('ticks the Tools option per default', async () => {
    const component = await createComponent();
    expect(component.form.get('toolsDep')?.value).toBe(true);
  });

  it('keeps the tool module and the gdx-tools dependency when Tools is ticked', async () => {
    const component = await createComponent();
    component.form.get('toolsDep')?.setValue(true);
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    expect(findFileBySuffix(downloaded, '/tool/build.gradle.kts')).not.toBeNull();
    expect(findFileBySuffix(downloaded, '/tool/src/main/kotlin/io/github/texturePacker.kt')).not.toBeNull();

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).toContain('gdxTools');

    const settings = await fileContent(downloaded, '/settings.gradle.kts');
    expect(settings).toContain('include(":tool")');
  });

  it('removes the tool module, the gdx-tools dependency and the tool include when Tools is unticked', async () => {
    const component = await createComponent();
    component.form.get('toolsDep')?.setValue(false);
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    let toolFiles = 0;
    for (const filePath in downloaded.files) {
      if (filePath.includes('/tool/')) {
        toolFiles++;
      }
    }
    expect(toolFiles).toBe(0);

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).not.toMatch(/^gdxTools/m);

    const settings = await fileContent(downloaded, '/settings.gradle.kts');
    expect(settings).not.toContain('include(":tool")');
    expect(settings).toContain('include(":core")');
    expect(settings).toContain('include(":lwjgl3")');
    expect(settings).toContain('include(":teavm")');
    // the foojay toolchains plugin must not be removed by the tool filter
    expect(settings).toContain('foojay-resolver-convention');
  });

  it('applies the default dependency filters to core/build.gradle.kts', async () => {
    const component = await createComponent();
    // default values: b2dDep, gdxAiDep, ktxI18nDep and ktxScene2dDep are off,
    // freetypist is on (which transitively includes textratypist)
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);
    const coreBuild = await fileContent(downloaded, '/core/build.gradle.kts');

    // box2d, ai and i18n dependencies are disabled per default
    expect(coreBuild).not.toContain('box2dBundle');
    expect(coreBuild).not.toContain('aiBundle');
    expect(coreBuild).not.toContain('ktxI18n');
    // textratypist is included in freetypist -> removed when freetypist is on
    expect(coreBuild).not.toContain('textraTypist');
    expect(coreBuild).not.toContain('textratypist');

    // enabled dependencies are kept
    expect(coreBuild).toContain('freetypeBundle');
    expect(coreBuild).toContain('ktxTiled');
    expect(coreBuild).toContain('ktxPreferences');
    expect(coreBuild).toContain('fleks');
    expect(coreBuild).toContain('freeTypist');
    expect(coreBuild).toContain('kotlinxSerializationJson');
  });

  it('applies the lwjgl3 build updates when using default values', async () => {
    const component = await createComponent();
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);
    const lwjgl3Build = await fileContent(downloaded, '/lwjgl3/build.gradle.kts');
    expect(lwjgl3Build).toContain('applicationName = "MyGdxGame"');
  });

  it('adjusts the tool package and main class together with the other modules when Tools is ticked', async () => {
    const component = await createComponent();
    component.form.get('toolsDep')?.setValue(true);
    component.form.get('packageName')?.setValue('com.example');
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    // tool source file is relocated to the new package
    const movedToolFile = findFileBySuffix(downloaded, '/tool/src/main/kotlin/com/example/texturePacker.kt');
    expect(movedToolFile).not.toBeNull();
    const toolSource = await fileContent(downloaded, '/tool/src/main/kotlin/com/example/texturePacker.kt');
    expect(toolSource).toContain('package com.example');

    // no leftover io/github folders or files
    for (const filePath in downloaded.files) {
      expect(filePath).not.toContain('/kotlin/io/github/');
    }

    // the tool main class in the build file is adjusted like for lwjgl3/teavm
    const toolBuild = await fileContent(downloaded, '/tool/build.gradle.kts');
    expect(toolBuild).toContain('mainClass.set("com.example.TexturePackerKt")');

    const lwjgl3Build = await fileContent(downloaded, '/lwjgl3/build.gradle.kts');
    expect(lwjgl3Build).toContain('mainClass = "com.example.Lwjgl3LauncherKt"');

    const teaVmBuild = await fileContent(downloaded, '/teavm/build.gradle.kts');
    expect(teaVmBuild).toContain('mainClass.set("com.example.TeaVMLauncherKt")');
  });

  it('leaves the Gdx-Controllers option unticked per default', async () => {
    const component = await createComponent();
    expect(component.form.get('gdxControllersDep')?.value).toBe(false);
  });

  it('removes the gdx-controllers lines when Gdx-Controllers is unticked', async () => {
    const component = await createComponent();
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).not.toMatch(/^gdxControllers/m);
    expect(toml).not.toMatch(/^gdxTeaVmControllers/m);
    expect(toml).not.toContain('# gdx controllers');

    const coreBuild = await fileContent(downloaded, '/core/build.gradle.kts');
    expect(coreBuild).not.toContain('gdxControllersCore');

    const lwjgl3Build = await fileContent(downloaded, '/lwjgl3/build.gradle.kts');
    expect(lwjgl3Build).not.toContain('gdxControllersDesktop');

    const teaVmBuild = await fileContent(downloaded, '/teavm/build.gradle.kts');
    expect(teaVmBuild).not.toContain('gdxTeaVmControllers');
  });

  it('keeps the gdx-controllers lines when Gdx-Controllers is ticked', async () => {
    const component = await createComponent();
    component.form.get('gdxControllersDep')?.setValue(true);
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).toMatch(/^gdxControllersVersion/m);
    expect(toml).toMatch(/^gdxControllersCore/m);
    expect(toml).toMatch(/^gdxTeaVmControllers/m);
    expect(toml).toMatch(/^gdxControllersDesktop/m);
    expect(toml).toContain('# gdx controllers');

    const coreBuild = await fileContent(downloaded, '/core/build.gradle.kts');
    expect(coreBuild).toContain('gdxControllersCore');

    const lwjgl3Build = await fileContent(downloaded, '/lwjgl3/build.gradle.kts');
    expect(lwjgl3Build).toContain('gdxControllersDesktop');

    const teaVmBuild = await fileContent(downloaded, '/teavm/build.gradle.kts');
    expect(teaVmBuild).toContain('gdxTeaVmControllers');
  });

  it('removes the teavm gdx-controllers line from the version catalog when TeaVM is unticked', async () => {
    const component = await createComponent();
    component.form.get('gdxControllersDep')?.setValue(true);
    component.form.get('teaVmLauncher')?.setValue(false);
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).toMatch(/^gdxControllersVersion/m);
    expect(toml).toMatch(/^gdxControllersCore/m);
    expect(toml).toMatch(/^gdxControllersDesktop/m);
    expect(toml).not.toMatch(/^gdxTeaVmControllers/m);
  });

  it('removes the desktop gdx-controllers line from the version catalog when Desktop is unticked', async () => {
    const component = await createComponent();
    component.form.get('gdxControllersDep')?.setValue(true);
    component.form.get('desktopLauncher')?.setValue(false);
    await component.downloadTemplate();

    const downloaded = await new JSZip().loadAsync(downloadSpy.mock.calls[0][0]);

    const toml = await fileContent(downloaded, '/gradle/libs.versions.toml');
    expect(toml).toMatch(/^gdxControllersVersion/m);
    expect(toml).toMatch(/^gdxControllersCore/m);
    expect(toml).toMatch(/^gdxTeaVmControllers/m);
    expect(toml).not.toMatch(/^gdxControllersDesktop/m);
  });
});
