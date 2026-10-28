/// <reference types="vitest/globals" />
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {FormControl} from '@angular/forms';
import {TestBed} from '@angular/core/testing';
import {CharacterExtractorComponent} from './character-extractor.component';
import {DownloadService} from '../../services/download.service';

function createComponent(): CharacterExtractorComponent {
  const fixture = TestBed.createComponent(CharacterExtractorComponent);
  fixture.componentRef.setInput('modeControl', new FormControl('Character (multi-sheet)'));
  fixture.componentRef.setInput('modeOptions', ['Character (multi-sheet)', 'Single sheet']);
  return fixture.componentInstance;
}

const INPUT = join(process.cwd(), 'test-fixtures', 'swordsman', 'input');

describe('CharacterExtractorComponent', () => {
  it('detects the sheets, extracts the frames and zips them flat', async () => {
    const zips: {blob: Blob; name: string}[] = [];
    TestBed.configureTestingModule({
      imports: [CharacterExtractorComponent],
      providers: [{provide: DownloadService, useValue: {downloadZip: async (blob: Blob, name: string) => zips.push({blob, name})}}]
    });
    const component = createComponent();

    const files = readdirSync(INPUT).map(name => new File([new Uint8Array(readFileSync(join(INPUT, name)))], name, {type: 'image/png'}));
    await component.addFiles(files);

    expect(component.sheets().map(s => [s.animation, s.direction, s.rows]).sort()).toEqual([
      ['attack', '', 4], ['death', '', 4], ['hurt', '', 4], ['idle', '', 4], ['walk', '', 4]
    ]);
    expect(component.canOptimize()).toBe(true);

    await component.optimize();
    const result = component.result()!;
    expect([result.frameWidth, result.frameHeight, result.frames.length]).toEqual([46, 43, 144]);
    expect(component.groups().flatMap(g => g.rows.flatMap(r => r.frames)).map(f => f.name)).toContain('walk_down_1');

    await component.downloadFrames();
    expect(zips).toHaveLength(1);
    expect(zips[0].name).toBe('frames.zip');
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await zips[0].blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toHaveLength(144);
    expect(names.every(n => !n.includes('/') && n.endsWith('.png'))).toBe(true);
  });

  it('blocks optimize for duplicate animations', async () => {
    TestBed.configureTestingModule({imports: [CharacterExtractorComponent]});
    const component = createComponent();
    const name = 'Swordsman_lvl2_Idle_without_shadow.png';
    const bytes = new Uint8Array(readFileSync(join(INPUT, name)));
    await component.addFiles([new File([bytes], name), new File([bytes], 'copy_' + name)]);
    expect(component.duplicateKeys()).toEqual(['idle']);
    expect(component.canOptimize()).toBe(false);
  });
});
