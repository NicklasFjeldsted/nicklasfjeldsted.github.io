import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, ISectionContent} from '../admin.models';
import {IChosenImage, ImageSourceButtonsComponent} from '../media/image-source-buttons.component';

@Component({
  selector: 'mvo-primary-image-editor',
  imports: [ImageSourceButtonsComponent],
  template: `
    <p class="adm-hint">Hovedbilledet vises som sektionens primære billede på siden.</p>

    @if (pending()?.url ?? section().primaryImage?.url; as src) {
      <img class="adm-preview" [src]="src" alt="Hovedbillede">
      @if (pending()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet hovedbillede.</div>
    }

    <div class="adm-actions">
      <mvo-image-source-buttons title="Vælg hovedbillede" [context]="section().title + ' · Erstatter det nuværende hovedbillede, når du gemmer'"
                                [hasImage]="!!(pending() ?? section().primaryImage)" [disabled]="busy()" (chosen)="pending.set($event)" />
    </div>

    <div class="adm-savebar">
      <button type="button" class="adm-btn adm-btn--primary" (click)="save()" [disabled]="!dirty() || busy()">{{ busy() ? 'Gemmer…' : 'Gem ændringer' }}</button>
      <button type="button" class="adm-btn" (click)="reset()" [disabled]="!dirty() || busy()">Fortryd</button>
      @if (dirty()) { <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span> }
    </div>
  `,
})
export class PrimaryImageEditorComponent {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The section as it would look with the unsaved image, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly pending = signal<IChosenImage | null>(null);
  protected readonly busy = signal(false);
  protected readonly dirty = computed(() => this.pending() !== null);

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
    effect(() => {
      const p = this.pending();
      const s = this.section();
      this.draftChange.emit(p ? {...s, primaryImage: {mediaId: p.mediaId, url: p.url, altText: p.defaultAltText}} : s);
    });
  }

  protected save(): void {
    const s = this.section();
    const p = this.pending();
    if (!p) return;
    this.busy.set(true);
    // A new image brings the library's default alt text; the old image's text described another picture.
    this.api.setPrimaryImage(s.pageId, s.id, s.version, p.mediaId, p.defaultAltText).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Hovedbilledet er gemt.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.notify.emit({kind: 'error', text: `Hovedbilledet blev ikke gemt. ${error.message}`});
      },
    });
  }

  protected reset(): void {
    this.pending.set(null);
  }
}
