import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {AuthService} from '../auth.service';

@Component({
  selector: 'mvo-admin-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="adm adm-login">
      <form class="adm-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Log ind</h1>
        <p class="adm-hint">Administration af hjemmesidens indhold.</p>

        <div class="adm-field">
          <label for="login-email">E-mail</label>
          <input id="login-email" class="adm-input" type="email" formControlName="email" autocomplete="username"
                 [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched">
          @if (form.controls.email.invalid && form.controls.email.touched) { <span class="adm-error">Skriv en gyldig e-mailadresse.</span> }
        </div>

        <div class="adm-field">
          <label for="login-password">Adgangskode</label>
          <input id="login-password" class="adm-input" type="password" formControlName="password" autocomplete="current-password"
                 [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched">
          @if (form.controls.password.invalid && form.controls.password.touched) { <span class="adm-error">Skriv din adgangskode.</span> }
        </div>

        @if (error()) { <p class="adm-error" role="alert">{{ error() }}</p> }

        <button type="submit" class="adm-btn adm-btn--primary" [disabled]="busy()">{{ busy() ? 'Logger ind…' : 'Log ind' }}</button>
      </form>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.auth.isLoggedIn()) void this.router.navigate(['/admin']);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const {email, password} = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => void this.router.navigate(['/admin']),
      error: err => {
        this.busy.set(false);
        this.error.set(err.status === 401
          ? 'E-mail eller adgangskode er forkert.'
          : err.status === 0 ? 'Der er ingen forbindelse til serveren.' : 'Login mislykkedes. Prøv igen.');
      },
    });
  }
}
