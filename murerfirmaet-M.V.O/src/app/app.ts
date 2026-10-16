import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);

  protected readonly title = signal('murerfirmaet-M.V.O');
  protected readonly isAdmin = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/admin')),
    ),
    { initialValue: typeof location !== 'undefined' && location.pathname.includes('/admin') },
  );

  private lastPath = '';

  constructor() {
    // Links to a section (#anker) stop below the fixed header instead of underneath it.
    inject(ViewportScroller).setOffset([0, 112]);

    // A new page starts at the top. Only the path counts, so query changes in the admin and
    // links to a section on the same page (#anker) keep their own scroll position.
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => {
      const tree = this.router.parseUrl(event.urlAfterRedirects);
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      if (path !== this.lastPath && !tree.fragment && this.lastPath !== '') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      this.lastPath = path;
    });
  }
}
