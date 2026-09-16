import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  title = "Quilly's GDX Utilities";
}