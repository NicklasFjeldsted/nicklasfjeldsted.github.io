import {Component, HostListener, ViewEncapsulation, input, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight, faXmark} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'mvo-project-carousel',
  imports: [FaIconComponent],
  templateUrl: './project-carousel.component.html',
  styleUrl: './project-carousel.component.scss',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
})
export class ProjectCarouselComponent {
  images = input.required<string[]>();

  protected readonly activeIndex = signal(0);
  protected readonly slideClass = signal('');   // 'slide-left' | 'slide-right' | ''
  protected readonly modalImage = signal<string | null>(null);
  protected readonly modalClosing = signal(false);

  protected readonly faLeft = faChevronLeft;
  protected readonly faRight = faChevronRight;
  protected readonly faClose = faXmark;

  protected readonly desktopOffsets = [-2, -1, 0, 1, 2];
  protected readonly mobileOffsets = [-1, 0, 1];

  protected imageAt(offset: number): string {
    const imgs = this.images();
    const idx = ((this.activeIndex() + offset) % imgs.length + imgs.length) % imgs.length;
    return imgs[idx];
  }

  protected navigate(delta: number): void {
    const len = this.images().length;
    this.activeIndex.update(i => ((i + delta) % len + len) % len);
    this.slideClass.set(delta > 0 ? 'slide-left' : 'slide-right');
  }

  protected onSlideEnd(): void {
    this.slideClass.set('');
  }

  protected goToOffset(offset: number): void {
    if (offset !== 0) this.navigate(offset);
  }

  protected openModal(): void {
    this.modalClosing.set(false);
    this.modalImage.set(this.imageAt(0));
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
