import {Component, computed, effect, inject, input, output, signal, untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AdminApiService} from '../admin-api.service';
import {IApiError, IMediaDetail, IMediaUsage, INotice, fieldMessages} from '../admin.models';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {contentLinkParams} from '../shell/admin-nav.service';

/** Details of one library image: rename it, set its default alt text, see where it is used, and delete it when unused. */
@Component({
  selector: 'mvo-media-detail',
  imports: [FormsModule, RouterLink],
  template: `
    @if (loading() && !detail()) {
      <p class="adm-hint" role="status">Henter billede…</p>
    } @else if (detail(); as d) {
      <a class="lib-detail__img" [href]="d.url" target="_blank" rel="noopener" title="Åbn billedet i fuld størrelse">
        <img [src]="d.url" [alt]="d.defaultAltText || d.name" (load)="measure($event)">
      </a>
      <h3>{{ d.name }}</h3>
      <dl>
        <dt>Uploadet</dt><dd>{{ date(d.createdUtc) }}</dd>
        <dt>Størrelse</dt><dd>@if (dimensions(); as dim) { {{ dim }} · }{{ size(d.sizeBytes) }}</dd>
        <dt>Original fil</dt><dd class="lib-detail__file">{{ d.originalFileName }}</dd>
      </dl>

      <form (ngSubmit)="save()">
        <div class="adm-field">
          <label for="media-name">Navn</label>
          <input id="media-name" name="name" class="adm-input" maxlength="200" autocomplete="off" [ngModel]="name()" (ngModelChange)="name.set($event)"
                 [attr.aria-invalid]="nameErrors().length ? 'true' : null">
          @for (e of nameErrors(); track e) { <span class="adm-error">{{ e }}</span> }
        </div>
        <div class="adm-field">
          <label for="media-alt">Standard alternativ tekst</label>
          <input id="media-alt" name="alt" class="adm-input" maxlength="300" autocomplete="off" [ngModel]="alt()" (ngModelChange)="alt.set($event)">
          <span class="adm-hint">Foreslås, når billedet bruges et nyt sted.</span>
        </div>
        @if (dirty()) {
          <div class="adm-actions" style="margin-top: 0">
            <button type="submit" class="adm-btn adm-btn--primary" [disabled]="saving() || !name().trim()">{{ saving() ? 'Gemmer…' : 'Gem' }}</button>
            <button type="button" class="adm-btn" (click)="reset()" [disabled]="saving()">Annullér</button>
            <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span>
          </div>
        }
      </form>

      <h4 class="lib-detail__uses-head">{{ d.usages.length ? 'Bruges ' + (d.usages.length === 1 ? 'ét sted' : d.usages.length + ' steder') : 'Bruges ikke på siden' }}</h4>
      @if (d.usages.length) {
        <ul class="lib-uses">
          @for (u of d.usages; track $index) {
            <li>
              <a [routerLink]="['/admin']" [queryParams]="link(u)">{{ u.pageName }} › {{ u.sectionTitle }}</a>
              <small class="adm-hint">{{ usageLabel(u) }}</small>
            </li>
          }
        </ul>
      }

      <div class="adm-actions">
        <button type="button" class="adm-btn adm-btn--danger" (click)="remove()" [disabled]="d.usages.length > 0 || deleting()">
          {{ deleting() ? 'Sletter…' : 'Slet billede' }}
        </button>
      </div>
      @if (d.usages.length) { <p class="adm-hint">Billedet kan først slettes, når det ikke bruges nogen steder.</p> }
    }
  `,
})
export class MediaDetailComponent {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);

  readonly mediaId = input.required<number>();
  readonly saved = output<IMediaDetail>();
  readonly deleted = output<number>();
  readonly dirtyChange = output<boolean>();
  readonly notify = output<INotice>();

  protected readonly detail = signal<IMediaDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly name = signal('');
  protected readonly alt = signal('');
  protected readonly nameErrors = signal<string[]>([]);
  protected readonly dimensions = signal('');
  protected readonly dirty = computed(() => {
    const d = this.detail();
    return !!d && (this.name().trim() !== d.name || (this.alt().trim() || null) !== d.defaultAltText);
  });

  constructor() {
    effect(() => {
      const id = this.mediaId();
      untracked(() => this.load(id));
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  protected reset(): void {
    const d = this.detail();
    this.name.set(d?.name ?? '');
    this.alt.set(d?.defaultAltText ?? '');
    this.nameErrors.set([]);
  }

  protected save(): void {
    const d = this.detail();
    if (!d || !this.dirty() || !this.name().trim()) return;
    this.saving.set(true);
    this.api.updateMedia(d.id, this.name().trim(), this.alt().trim() || null).subscribe({
      next: updated => {
        this.saving.set(false);
        this.detail.set(updated);
        this.reset();
        this.saved.emit(updated);
        this.notify.emit({kind: 'success', text: 'Billedets oplysninger er gemt.'});
      },
      error: (e: IApiError) => {
        this.saving.set(false);
        this.nameErrors.set(fieldMessages(e.fields, 'Name'));
        this.notify.emit({kind: 'error', text: `Oplysningerne blev ikke gemt. ${e.message}`});
      },
    });
  }

  protected async remove(): Promise<void> {
    const d = this.detail();
    if (!d || d.usages.length) return;
    const ok = await this.confirm.ask({
      title: 'Slet billedet permanent?',
      message: `"${d.name}" slettes fra billedarkivet og kan ikke gendannes.`,
      confirmLabel: 'Slet billede',
      destructive: true,
    });
    if (!ok) return;
    this.deleting.set(true);
    this.api.deleteMedia(d.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit(d.id);
        this.notify.emit({kind: 'success', text: `"${d.name}" er slettet.`});
      },
      error: (e: IApiError) => {
        this.deleting.set(false);
        this.notify.emit({kind: 'error', text: `Billedet blev ikke slettet. ${e.message}`});
        this.load(d.id);
      },
    });
  }

  protected measure(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.dimensions.set(`${img.naturalWidth} × ${img.naturalHeight}`);
  }

  protected link(u: IMediaUsage) {
    // Only the profile has its image on a separate tab; other sections show their images with the rest of the content.
    return contentLinkParams(u.pageId, u.sectionId, u.sectionType === 'Profile' && u.kind === 'Primary' ? 'primary' : 'text');
  }

  protected usageLabel(u: IMediaUsage): string {
    if (u.sectionType === 'BeforeAfter') return u.kind === 'Primary' ? 'Før-billede' : 'Efter-billede';
    return u.kind === 'Primary' ? 'Hovedbillede' : `Galleri, position ${u.position}`;
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('da-DK', {day: 'numeric', month: 'long', year: 'numeric'});
  }

  protected size(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private load(id: number): void {
    this.loading.set(true);
    this.dimensions.set('');
    this.api.getMedia(id).subscribe({
      next: d => {
        this.loading.set(false);
        this.detail.set(d);
        this.reset();
      },
      error: (e: IApiError) => {
        this.loading.set(false);
        this.detail.set(null);
        this.notify.emit({kind: 'error', text: `Billedet kunne ikke hentes. ${e.message}`});
      },
    });
  }
}
