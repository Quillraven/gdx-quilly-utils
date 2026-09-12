import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';

interface Tool {
  path: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.component.css'
})
export class HomeComponent {
  tools: Tool[] = [
    {
      path: '/tile-extruder',
      title: 'Tileset Extruder',
      description: 'Add padding around each tile in your tileset to prevent texture bleeding.'
    },
    {
      path: '/image-split',
      title: 'Spritesheet Splitter',
      description: 'Split a spritesheet into individual tiles by count or by tile size.'
    },
    {
      path: '/image-combine',
      title: 'Image Combiner',
      description: 'Combine multiple images into a single grid layout.'
    },
    {
      path: '/sheet-optimizer',
      title: 'Sheet Optimizer',
      description: 'Trim transparent borders and re-center every frame of a spritesheet.'
    },
    {
      path: '/gradle-kotlin-template',
      title: 'Gradle Kotlin Template',
      description: 'Generate a modern Gradle Kotlin DSL template for LibGDX Kotlin projects.'
    }
  ];
}