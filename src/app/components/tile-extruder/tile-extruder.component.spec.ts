import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileExtruderComponent } from './tile-extruder.component';

describe('TileExtruderComponent', () => {
  let component: TileExtruderComponent;
  let fixture: ComponentFixture<TileExtruderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileExtruderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileExtruderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
