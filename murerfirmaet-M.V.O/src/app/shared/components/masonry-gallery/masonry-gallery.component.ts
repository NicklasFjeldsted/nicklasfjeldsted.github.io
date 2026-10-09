import {Component, computed, effect, input, signal} from '@angular/core';
import {IMasonryImage} from '../../../core/interfaces/masonry-page.interface';

@Component({
  selector: 'mvo-masonry-gallery',
  templateUrl: './masonry-gallery.component.html',
  styleUrl: './masonry-gallery.component.scss',
  standalone: true,
})
export class MasonryGalleryComponent {
  primaryImage = input<IMasonryImage>();
  gallery = input<IMasonryImage[]>([]);
  title = input('');

  protected readonly selectedId = signal<string | null>(null);

  protected readonly images = computed(() => {
    const primary = this.primaryImage();
    const gallery = this.gallery();
    if (!primary) return gallery;
    return gallery.some(image => image.id === primary.id) ? gallery : [primary, ...gallery];
  });

  protected readonly selected = computed(() => {
    const images = this.images();
    return images.find(image => image.id === this.selectedId())
      ?? images.find(image => image.id === this.primaryImage()?.id)
      ?? images[0];
  });

  protected readonly showThumbnails = computed(() => this.images().length > 1);

  constructor() {
    effect(() => {
      this.primaryImage();
      this.selectedId.set(null);
    });
  }

  protected select(image: IMasonryImage): void {
    this.selectedId.set(image.id);
  }
}
