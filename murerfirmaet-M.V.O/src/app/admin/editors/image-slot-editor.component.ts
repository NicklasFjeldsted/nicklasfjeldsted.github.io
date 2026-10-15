import {Component, computed, effect, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {IChosenImage, ImageSourceButtonsComponent} from '../media/image-source-buttons.component';

export interface ISlotImage {
  url: string;
  altText: string | null;
  /** Changes whenever the saved image or its text changes, so the slot can drop its pending edits. */
  key: string;
}

export interface ISlotSave {
  /** The newly chosen library image, or null to keep the current image and only save the alt text. */
  mediaId: number | null;
  altText: string | null;
}

/** One image with preview, alternative text and an explicit confirm/cancel step. Presentational: the parent saves. */
@Component({
  selector: 'mvo-image-slot-editor',
  imports: [FormsModule, ImageSourceButtonsComponent],
  template: `
    <h3>{{ label() }}</h3>
    <p class="adm-hint">{{ hint() }}</p>

    @if (pending()?.url ?? current()?.url; as src) {
      <img class="adm-preview" [src]="src" [alt]="alt() || label()">
      @if (pending()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet billede.</div>
    }

    <div class="adm-field" style="margin-top: 1rem">
      <label [for]="id() + '-alt'">Alternativ tekst</label>
      <input [id]="id() + '-alt'" class="adm-input" [ngModel]="alt()" (ngModelChange)="alt.set($event)" maxlength="300"
             autocomplete="off" [disabled]="!(pending() ?? current())">
    </div>

    <div class="adm-actions">
      <mvo-image-source-buttons [title]="'Vælg ' + label().toLowerCase()" [context]="hint()" [hasImage]="!!current()"
                                [disabled]="busy()" (chosen)="choose($event)" />
      @if (dirty()) {
        <button type="button" class="adm-btn adm-btn--primary" (click)="confirm()" [disabled]="busy()">{{ busy() ? 'Gemmer…' : 'Bekræft og gem' }}</button>
        <button type="button" class="adm-btn" (click)="reset()" [disabled]="busy()">Annullér</button>
      }
    </div>
  `,
})
export class ImageSlotEditorComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly current = input<ISlotImage | null>(null);
  readonly busy = input(false);
  readonly save = output<ISlotSave>();
  readonly dirtyChange = output<boolean>();

  protected readonly alt = signal('');
  protected readonly pending = signal<IChosenImage | null>(null);
  protected readonly dirty = computed(() =>
    this.pending() !== null || (this.current() !== null && this.alt().trim() !== (this.current()?.altText ?? '')));

  private readonly savedKey = computed(() => this.current()?.key ?? '');

  constructor() {
    effect(() => {
      this.savedKey();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  protected choose(image: IChosenImage): void {
    this.pending.set(image);
    if (!this.alt().trim() && image.defaultAltText) this.alt.set(image.defaultAltText);
  }

  protected confirm(): void {
    this.save.emit({mediaId: this.pending()?.mediaId ?? null, altText: this.alt().trim() || null});
  }

  protected reset(): void {
    this.pending.set(null);
    this.alt.set(this.current()?.altText ?? '');
  }
}
