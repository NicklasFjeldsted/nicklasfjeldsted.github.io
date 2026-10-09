import {Directive, ElementRef, OnDestroy, OnInit, inject, input} from '@angular/core';

@Directive({
  selector: '[mvoReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  delay = input(0, {alias: 'mvoRevealDelay'});
  threshold = input(0.15, {alias: 'mvoRevealThreshold', transform: Number});

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    this.host.classList.add('mvo-reveal');
    this.host.style.setProperty('--reveal-delay', `${this.delay()}ms`);

    if (typeof IntersectionObserver === 'undefined') {
      this.host.classList.add('mvo-reveal--visible');
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.host.classList.add('mvo-reveal--visible');
          this.observer?.disconnect();
        }
      },
      {threshold: this.threshold(), rootMargin: '0px 0px -5% 0px'},
    );
    this.observer.observe(this.host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
