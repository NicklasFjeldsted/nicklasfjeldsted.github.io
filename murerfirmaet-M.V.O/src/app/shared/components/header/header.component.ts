import {Component, DestroyRef, HostListener, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faPhone, faXmark} from '@fortawesome/free-solid-svg-icons';
import {filter} from 'rxjs/operators';
import {ContactConstants} from '../../../core/constants/contact.constants';

export type HeaderTheme = 'dark' | 'light';

interface INavItem {
  labelKey: string;
  path: string;
  exact: boolean;
}

const HIDE_AFTER_PX = 80;
const SCROLL_DELTA_PX = 6;

@Component({
  selector: 'mvo-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, FaIconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
})
export class HeaderComponent {
  private readonly router = inject(Router);

  protected readonly theme = signal<HeaderTheme>('dark');
  protected readonly hidden = signal(false);
  protected readonly atTop = signal(true);
  protected readonly menuOpen = signal(false);

  protected readonly navItems: INavItem[] = [
    {labelKey: 'nav.home', path: '/', exact: true},
    {labelKey: 'nav.specializedMasonry', path: '/specialiseret-murerarbejde', exact: false},
  ];

  protected readonly callHref = `tel:+${ContactConstants.PHONE_NUMBER}`;
  protected readonly phoneNumber = ContactConstants.PHONE_NUMBER;
  protected readonly faPhone = faPhone;
  protected readonly faBars = faBars;
  protected readonly faXmark = faXmark;

  private lastScrollY = 0;
  private ticking = false;

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.theme.set(this.resolveTheme(this.router.routerState.snapshot.root));
        this.menuOpen.set(false);
        this.hidden.set(false);
      });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.updateVisibility(window.scrollY);
      this.ticking = false;
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.menuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update(open => !open);
    if (this.menuOpen()) this.hidden.set(false);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private updateVisibility(currentY: number): void {
    const delta = currentY - this.lastScrollY;
    this.atTop.set(currentY <= 8);

    if (this.menuOpen() || currentY <= HIDE_AFTER_PX) {
      this.hidden.set(false);
    } else if (delta > SCROLL_DELTA_PX) {
      this.hidden.set(true);
    } else if (delta < -SCROLL_DELTA_PX) {
      this.hidden.set(false);
    }

    if (Math.abs(delta) > SCROLL_DELTA_PX || currentY <= HIDE_AFTER_PX) {
      this.lastScrollY = currentY;
    }
  }

  private resolveTheme(route: ActivatedRouteSnapshot): HeaderTheme {
    let current: ActivatedRouteSnapshot | null = route;
    let theme: HeaderTheme = 'dark';
    while (current) {
      const value = current.data['headerTheme'] as HeaderTheme | undefined;
      if (value) theme = value;
      current = current.firstChild;
    }
    return theme;
  }
}
