import {Component, OnDestroy, computed, effect, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES} from '../admin.models';

export interface ISlotImage {
  url: string;
  altText: string | null;
  /** Changes whenever the saved image or its text changes, so the slot can drop its pending edits. */
  key: string;
}

export interface ISlotSave {
  file: File | null;
  altText: string | null;
}

/** One image with preview, alternative text and an explicit confirm/cancel step. Presentational: the parent saves. */
@Component({
  selector: 'mvo-image-slot-editor',
  imports: [FormsModule],
  template: `
    <h3>{{ label() }}</h3>
    <p class="adm-hint">{{ hint() }}</p>

    @if (previewUrl() ?? current()?.url; as src) {
      <img class="adm-preview" [src]="src" [alt]="alt() || label()">
      @if (pendingFile()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet billede.</div>
    }

    <div class="adm-field" style="margin-top: 1rem">
      <label [for]="id() + '-alt'">Alternativ tekst</label>
      <input [id]="id() + '-alt'" class="adm-input" [ngModel]="alt()" (ngModelChange)="alt.set($event)" maxlength="300"
             autocomplete="off" [disabled]="!(previewUrl() ?? current())">
    </div>

    @if (fileError()) { <p class="adm-error" role="alert">{{ fileError() }}</p> }

    <div class="adm-actions">
      <label class="adm-btn">
        {{ current() ? 'Vælg andet billede' : 'Vælg billede' }}
        <input type="file" class="adm-visually-hidden" [accept]="accept" (change)="pick($event)" [disabled]="busy()">
      </label>
      @if (dirty()) {
        <button type="button" class="adm-btn adm-btn--primary" (click)="confirm()" [disabled]="busy()">{{ busy() ? 'Gemmer…' : 'Bekræft og gem' }}</button>
        <button type="button" class="adm-btn" (click)="reset()" [disabled]="busy()">Annullér</button>
      }
    </div>
  `,
})
export class ImageSlotEditorComponent implements OnDestroy {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly current = input<ISlotImage | null>(null);
  readonly busy = input(false);
  readonly save = output<ISlotSave>();
  readonly dirtyChange = output<boolean>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly alt = signal('');
  protected readonly pendingFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly fileError = signal('');
  protected readonly dirty = computed(() =>
    this.pendingFile() !== null || (this.current() !== null && this.alt().trim() !== (this.current()?.altText ?? '')));

  private readonly savedKey = computed(() => this.current()?.key ?? '');

  constructor() {
    effect(() => {
      this.savedKey();
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

  protected confirm(): void {
    this.save.emit({file: this.pendingFile(), altText: this.alt().trim() || null});
  }

  protected reset(): void {
    this.revoke();
    this.pendingFile.set(null);
    this.previewUrl.set(null);
    this.fileError.set('');
    this.alt.set(this.current()?.altText ?? '');
  }

  private revoke(): void {
    const url = this.previewUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
