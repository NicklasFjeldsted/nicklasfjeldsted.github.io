import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, ISectionContent} from '../admin.models';
import {IChosenImage, ImageSourceButtonsComponent} from '../media/image-source-buttons.component';

@Component({
  selector: 'mvo-primary-image-editor',
  imports: [FormsModule, ImageSourceButtonsComponent],
  template: `
    <p class="adm-hint">Hovedbilledet vises som sektionens primære billede på siden.</p>

    @if (pending()?.url ?? section().primaryImage?.url; as src) {
      <img class="adm-preview" [src]="src" [alt]="alt() || 'Forhåndsvisning af hovedbillede'">
      @if (pending()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet hovedbillede.</div>
    }

    <div class="adm-field" style="margin-top: 1rem">
      <label for="primary-alt">Alternativ tekst</label>
      <input id="primary-alt" class="adm-input" [ngModel]="alt()" (ngModelChange)="alt.set($event)" maxlength="300" autocomplete="off"
             [disabled]="!(pending() ?? section().primaryImage)">
      <span class="adm-hint">Beskriv billedet kort for dem, der ikke kan se det.</span>
    </div>

    @if (fieldError()) { <p class="adm-error" role="alert">{{ fieldError() }}</p> }

    <div class="adm-actions">
      <mvo-image-source-buttons title="Vælg hovedbillede" [context]="section().title + ' · Erstatter det nuværende hovedbillede, når du gemmer'"
                                [hasImage]="!!section().primaryImage" [disabled]="busy()" (chosen)="choose($event)" />
      @if (dirty()) {
        <button type="button" class="adm-btn adm-btn--primary" (click)="confirm()" [disabled]="busy()">{{ busy() ? 'Gemmer…' : 'Bekræft og gem' }}</button>
        <button type="button" class="adm-btn" (click)="reset()" [disabled]="busy()">Annullér</button>
        <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span>
      }
    </div>
  `,
})
export class PrimaryImageEditorComponent {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  readonly notify = output<INotice>();

  protected readonly alt = signal('');
  protected readonly pending = signal<IChosenImage | null>(null);
  protected readonly fieldError = signal('');
  protected readonly busy = signal(false);
  protected readonly dirty = computed(() =>
    this.pending() !== null || (this.section().primaryImage !== null && this.alt().trim() !== (this.section().primaryImage?.altText ?? '')));

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
  }

  protected choose(image: IChosenImage): void {
    this.pending.set(image);
    if (!this.alt().trim() && image.defaultAltText) this.alt.set(image.defaultAltText);
  }

  protected confirm(): void {
    const s = this.section();
    const mediaId = this.pending()?.mediaId ?? s.primaryImage?.mediaId;
    if (mediaId === undefined) return;
    this.busy.set(true);
    this.api.setPrimaryImage(s.pageId, s.id, s.version, mediaId, this.alt().trim() || null).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Hovedbilledet er gemt.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.fieldError.set(error.fields['AltText']?.[0] ?? '');
        this.notify.emit({kind: 'error', text: `Hovedbilledet blev ikke gemt. ${error.message}`});
      },
    });
  }

  protected reset(): void {
    this.pending.set(null);
    this.fieldError.set('');
    this.alt.set(this.section().primaryImage?.altText ?? '');
  }
}
