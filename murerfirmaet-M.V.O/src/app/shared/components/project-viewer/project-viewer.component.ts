import {Component, computed, input, model} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {IMasonryImage} from '../../../core/interfaces/masonry-page.interface';

/** A large image with arrows, a counter and thumbnails. Used in the project popup and on the project page. */
@Component({
  selector: 'mvo-project-viewer',
  imports: [FaIconComponent],
  templateUrl: './project-viewer.component.html',
  styleUrl: './project-viewer.component.scss',
  standalone: true,
  host: {'[class.project-viewer--large]': 'large()'},
})
export class ProjectViewerComponent {
  images = input<IMasonryImage[]>([]);
  title = input('');
  index = model(0);
  large = input(false);

  protected readonly current = computed(() => this.images()[this.index()] ?? this.images()[0]);
  protected readonly faLeft = faChevronLeft;
  protected readonly faRight = faChevronRight;

  step(delta: number): void {
    const count = this.images().length;
    if (count > 1) this.index.set((this.index() + delta + count) % count);
  }
}
