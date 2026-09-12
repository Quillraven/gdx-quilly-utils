import {Component, ElementRef, ViewChild} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  exact: boolean;
}

@Component({
  selector: 'app-nav-menu',
  imports: [
    RouterLinkActive,
    RouterLink
  ],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.css'
})
export class NavMenuComponent {
  @ViewChild('navMenu') navMenuElement!: ElementRef<HTMLDetailsElement>;

  navItems: NavItem[] = [
    {path: '/', label: 'Home', exact: true},
    {path: '/tile-extruder', label: 'Tile Extruder', exact: true},
    {path: '/image-split', label: 'Spritesheet Splitter', exact: true},
    {path: '/image-combine', label: 'Image Combiner', exact: true},
    {path: '/sheet-optimizer', label: 'Sheet Optimizer', exact: true},
    {path: '/gradle-kotlin-template', label: 'Gradle Kotlin Template', exact: true}
  ];

  closeMenu(): void {
    this.navMenuElement.nativeElement.open = false;
  }
}