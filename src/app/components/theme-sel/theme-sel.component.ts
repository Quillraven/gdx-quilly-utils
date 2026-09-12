import {ChangeDetectionStrategy, Component, effect, signal} from '@angular/core';

@Component({
  selector: 'app-theme-sel',
  imports: [],
  templateUrl: './theme-sel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './theme-sel.component.css'
})
export class ThemeSelComponent {
  isDark = signal(localStorage.getItem('theme') === 'night');

  constructor() {
    effect(() => {
      const theme = this.isDark() ? 'night' : 'fantasy';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    });
  }

  toggleTheme() {
    this.isDark.set(!this.isDark());
  }
}
