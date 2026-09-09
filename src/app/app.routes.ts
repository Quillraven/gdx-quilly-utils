import {Routes} from '@angular/router';

export const routes: Routes = [
  {path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)},
  {
    path: 'tile-extruder',
    loadComponent: () => import('./components/tile-extruder/tile-extruder.component').then(m => m.TileExtruderComponent)
  },
  {
    path: 'image-split',
    loadComponent: () => import('./components/image-split/image-split.component').then(m => m.ImageSplitComponent)
  },
  {
    path: 'image-combine',
    loadComponent: () => import('./components/image-combine/image-combine.component').then(m => m.ImageCombineComponent)
  },
  {
    path: 'gradle-kotlin-template',
    loadComponent: () => import('./components/gradle-kotlin-template/gradle-kotlin-template.component').then(m => m.GradleKotlinTemplateComponent)
  },
  {
    path: 'sheet-optimizer',
    loadComponent: () => import('./components/sheet-optimizer/sheet-optimizer.component').then(m => m.SheetOptimizerComponent)
  }
];