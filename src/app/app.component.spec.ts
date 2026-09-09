/// <reference types="vitest/globals" />
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {AppComponent} from './app.component';
import {routes} from './app.routes';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes)]
    }).compileComponents();
  });

  it('should render the header title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('app-header h1');
    expect(header.textContent).toContain("Quilly's GDX Utilities");
  });
});