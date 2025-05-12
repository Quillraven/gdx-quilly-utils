import {Routes} from '@angular/router';
import {TileExtruderComponent} from './components/tile-extruder/tile-extruder.component';
import {HomeComponent} from './components/home/home.component';
import {ImageSplitComponent} from './components/image-split/image-split.component';

export const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: 'tile-extruder', component: TileExtruderComponent},
  {path: 'image-split', component: ImageSplitComponent},];
