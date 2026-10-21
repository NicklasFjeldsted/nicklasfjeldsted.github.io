import {Component, HostListener, ViewEncapsulation, inject, input, signal} from '@angular/core';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight, faXmark} from '@fortawesome/free-solid-svg-icons';

/** An image in the carousel. Images of a project carry its title and a link to the project page. */
export interface ICarouselItem {
  url: string;
  title?: string;
  link?: string;
}

@Component({
  selector: 'mvo-project-carousel',
  imports: [FaIconComponent],
  templateUrl: './project-carousel.component.html',
  styleUrl: './project-carousel.component.scss',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
})
export class ProjectCarouselComponent {
  private readonly router = inject(Router);

  readonly items = input.required<ICarouselItem[]>();

  protected readonly activeIndex = signal(0);
  protected readonly slideClass = signal('');   // 'slide-left' | 'slide-right' | ''
  protected readonly modalImage = signal<string | null>(null);
  protected readonly modalClosing = signal(false);

  protected readonly faLeft = faChevronLeft;
  protected readonly faRight = faChevronRight;
  protected readonly faClose = faXmark;

  protected readonly desktopOffsets = [-2, -1, 0, 1, 2];
  protected readonly mobileOffsets = [-1, 0, 1];

  protected itemAt(offset: number): ICarouselItem {
    const items = this.items();
    const idx = ((this.activeIndex() + offset) % items.length + items.length) % items.length;
    return items[idx];
  }

  protected navigate(delta: number): void {
    const len = this.items().length;
    this.activeIndex.update(i => ((i + delta) % len + len) % len);
    this.slideClass.set(delta > 0 ? 'slide-left' : 'slide-right');
  }

  protected onSlideEnd(): void {
    this.slideClass.set('');
  }

  protected goToOffset(offset: number): void {
    if (offset !== 0) this.navigate(offset);
  }

  /** The middle image opens its project when it has one, and is shown large otherwise. */
  protected openCenter(): void {
    const item = this.itemAt(0);
    if (item.link) {
      this.router.navigateByUrl(item.link);
      return;
    }
    this.modalClosing.set(false);
    this.modalImage.set(item.url);
  }

  protected closeModal(): void {
    this.modalClosing.set(true);
    setTimeout(() => {
      this.modalImage.set(null);
      this.modalClosing.set(false);
    }, 160);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeModal();
  }
}
