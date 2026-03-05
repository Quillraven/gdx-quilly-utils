import {Component, effect, signal} from '@angular/core';

@Component({
  selector: 'app-theme-sel',
  imports: [],
  templateUrl: './theme-sel.component.html',
  styleUrl: './theme-sel.component.css'
})
export class ThemeSelComponent {
  isDark = signal(localStorage.getItem('theme') === 'night');

  constructor() {
    effect(() => {
      const theme = this.isDark() ? 'night' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    });
  }

  toggleTheme() {
    this.isDark.set(!this.isDark());
  }
}
