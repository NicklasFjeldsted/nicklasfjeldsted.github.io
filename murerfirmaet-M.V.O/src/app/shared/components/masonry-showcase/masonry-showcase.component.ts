import {Component, input} from '@angular/core';
import {IMasonrySection} from '../../../core/interfaces/masonry-page.interface';
import {MasonryGalleryComponent} from '../masonry-gallery/masonry-gallery.component';
import {RevealDirective} from '../../directives/reveal.directive';

@Component({
  selector: 'mvo-masonry-showcase',
  imports: [MasonryGalleryComponent, RevealDirective],
  templateUrl: './masonry-showcase.component.html',
  styleUrl: './masonry-showcase.component.scss',
  standalone: true,
})
export class MasonryShowcaseComponent {
  section = input.required<IMasonrySection>();
  reversed = input(false);
}
