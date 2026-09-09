import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ThemeSelComponent} from '../theme-sel/theme-sel.component';
import {NavMenuComponent} from '../nav-menu/nav-menu.component';

@Component({
  selector: 'app-header',
  imports: [
    ThemeSelComponent,
    NavMenuComponent
  ],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  title = "Quilly's GDX Utilities";
}