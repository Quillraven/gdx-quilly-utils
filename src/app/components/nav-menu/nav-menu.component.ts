import {Component} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {ThemeSelComponent} from '../theme-sel/theme-sel.component';

type NavIcon = 'home' | 'grid' | 'split' | 'layers' | 'optimize' | 'code';

interface NavItem {
  path: string;
  label: string;
  exact: boolean;
  icon: NavIcon;
}

@Component({
  selector: 'app-nav-menu',
  imports: [
    RouterLinkActive,
    RouterLink,
    ThemeSelComponent
  ],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.css'
})
export class NavMenuComponent {
  navItems: NavItem[] = [
    {path: '/', label: 'Home', exact: true, icon: 'home'},
    {path: '/tile-extruder', label: 'Tile Extruder', exact: true, icon: 'grid'},
    {path: '/image-split', label: 'Spritesheet Splitter', exact: true, icon: 'split'},
    {path: '/image-combine', label: 'Image Combiner', exact: true, icon: 'layers'},
    {path: '/sheet-optimizer', label: 'Sheet Optimizer', exact: true, icon: 'optimize'},
    {path: '/gradle-kotlin-template', label: 'Kotlin Template', exact: true, icon: 'code'}
  ];

  closeMenu(): void {
    const toggle = document.getElementById('main-drawer') as HTMLInputElement | null;
    if (toggle) {
      toggle.checked = false;
    }
  }
}
