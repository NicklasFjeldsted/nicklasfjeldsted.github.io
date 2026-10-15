import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterOutlet} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {AuthService} from '../auth.service';
import {AdminNavService} from './admin-nav.service';

/** Frame around every admin screen: title, log out, and the tabs between the content editor and the image library. */
@Component({
  selector: 'mvo-admin-shell',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="adm adm-shell">
      <header class="adm-topbar">
        <h1>Administration</h1>
        <button type="button" class="adm-btn adm-btn--small" (click)="logout()">Log ud</button>
      </header>
      <nav class="adm-nav" aria-label="Administration">
        <a routerLink="/admin" [queryParams]="nav.contentParams()" [attr.aria-current]="path() === '/admin' ? 'page' : null">Website-indhold</a>
        <a routerLink="/admin/billeder" [attr.aria-current]="path() === '/admin/billeder' ? 'page' : null">Billedarkiv</a>
      </nav>
      <router-outlet />
    </div>
  `,
})
export class AdminShellComponent {
  protected readonly nav = inject(AdminNavService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly path = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.currentPath())),
    {initialValue: this.currentPath()},
  );

  private currentPath(): string {
    return this.router.url.split(/[?#]/)[0];
  }

  protected async logout(): Promise<void> {
    if (await this.nav.confirmLeave()) this.auth.logout();
  }
}
