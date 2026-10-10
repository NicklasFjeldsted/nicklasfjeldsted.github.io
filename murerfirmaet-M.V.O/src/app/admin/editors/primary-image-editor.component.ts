import {Component, OnDestroy, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {ALLOWED_IMAGE_TYPES, IApiError, INotice, ISectionContent, MAX_IMAGE_BYTES} from '../admin.models';

@Component({
  selector: 'mvo-primary-image-editor',
  imports: [FormsModule],
  template: `
    <p class="adm-hint">Hovedbilledet vises som sektionens primære billede på siden.</p>

    @if (previewUrl() ?? section().primaryImage?.url; as src) {
      <img class="adm-preview" [src]="src" [alt]="alt() || 'Forhåndsvisning af hovedbillede'">
      @if (pendingFile()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet hovedbillede.</div>
    }

    <div class="adm-field" style="margin-top: 1rem">
      <label for="primary-alt">Alternativ tekst</label>
      <input id="primary-alt" class="adm-input" [ngModel]="alt()" (ngModelChange)="alt.set($event)" maxlength="300" autocomplete="off"
             [disabled]="!(previewUrl() ?? section().primaryImage)">
      <span class="adm-hint">Beskriv billedet kort for dem, der ikke kan se det.</span>
    </div>

    @if (fileError()) { <p class="adm-error" role="alert">{{ fileError() }}</p> }

    <div class="adm-actions">
      <label class="adm-btn">
        {{ section().primaryImage ? 'Vælg andet billede' : 'Vælg billede' }}
        <input type="file" class="adm-visually-hidden" [accept]="accept" (change)="pick($event)">
      </label>
      @if (dirty()) {
        <button type="button" class="adm-btn adm-btn--primary" (click)="confirm()" [disabled]="busy()">{{ busy() ? 'Gemmer…' : 'Bekræft og gem' }}</button>
        <button type="button" class="adm-btn" (click)="cancel()" [disabled]="busy()">Annullér</button>
        <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span>
      }
    </div>
  `,
})
export class PrimaryImageEditorComponent implements OnDestroy {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  readonly notify = output<INotice>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly alt = signal('');
  protected readonly pendingFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly fileError = signal('');
  protected readonly busy = signal(false);
  protected readonly dirty = computed(() =>
    this.pendingFile() !== null || (this.section().primaryImage !== null && this.alt().trim() !== (this.section().primaryImage?.altText ?? '')));

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.split(',').includes(file.type)) {
      this.fileError.set('Filtypen understøttes ikke. Vælg et JPEG-, PNG- eller WebP-billede.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.fileError.set('Billedet er for stort. Maksimal størrelse er 10 MB.');
      return;
    }
    this.fileError.set('');
    this.revoke();
    this.pendingFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  protected cancel(): void {
    this.reset();
  }

  protected confirm(): void {
    const s = this.section();
    const altText = this.alt().trim() || null;
    const file = this.pendingFile();
    if (!file && !s.primaryImage) return;
    this.busy.set(true);

    const attach = (mediaId: number, uploaded: boolean) =>
      this.api.setPrimaryImage(s.pageId, s.id, s.version, mediaId, altText).subscribe({
        next: updated => {
          this.busy.set(false);
          this.sectionChange.emit(updated);
          this.notify.emit({kind: 'success', text: 'Hovedbilledet er gemt.'});
        },
        error: (error: IApiError) => {
          this.busy.set(false);
          if (uploaded) this.api.deleteMedia(mediaId).subscribe({error: () => undefined});
          this.fileError.set(error.fields['AltText']?.[0] ?? '');
          this.notify.emit({kind: 'error', text: `Hovedbilledet blev ikke gemt. ${error.message}`});
        },
      });

    if (file) {
      this.api.uploadMedia(file).subscribe({
        next: media => attach(media.id, true),
        error: (error: IApiError) => {
          this.busy.set(false);
          this.notify.emit({kind: 'error', text: `Billedet kunne ikke uploades. ${error.message}`});
        },
      });
    } else {
      attach(s.primaryImage!.mediaId, false);
    }
  }

  private reset(): void {
    this.revoke();
    this.pendingFile.set(null);
    this.previewUrl.set(null);
    this.fileError.set('');
    this.alt.set(this.section().primaryImage?.altText ?? '');
  }

  private revoke(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
