import {HttpClient} from '@angular/common/http';
import {Injectable, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {tap} from 'rxjs/operators';
import {API_BASE_URL} from '../core/config/api.config';

interface ILoginResponse {
  token: string;
  expiresUtc: string;
}

const STORAGE_KEY = 'mvo.admin.session';

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<ILoginResponse | null>(this.restore());

  readonly token = computed(() => {
    const s = this.session();
    return s && new Date(s.expiresUtc).getTime() > Date.now() ? s.token : null;
  });
  readonly isLoggedIn = computed(() => this.token() !== null);

  login(email: string, password: string) {
    return this.http
      .post<ILoginResponse>(`${API_BASE_URL}/api/admin/auth/login`, {email, password})
      .pipe(tap(response => this.store(response)));
  }

  logout(redirect = true): void {
    this.session.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* storage unavailable - the in-memory session is already cleared */ }
    if (redirect) void this.router.navigate(['/admin/login']);
  }

  private store(response: ILoginResponse): void {
    this.session.set(response);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    } catch { /* keep the session in memory only */ }
  }

  private restore(): ILoginResponse | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ILoginResponse) : null;
    } catch {
      return null;
    }
  }
}
