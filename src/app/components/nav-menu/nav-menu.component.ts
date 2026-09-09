import {Component, ElementRef, ViewChild} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

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

  closeMenu(): void {
    this.navMenuElement.nativeElement.open = false;
  }
}