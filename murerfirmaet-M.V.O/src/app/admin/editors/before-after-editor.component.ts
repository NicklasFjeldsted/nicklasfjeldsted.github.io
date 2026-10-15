import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, ISectionContent} from '../admin.models';
import {IChosenImage} from '../media/image-source-buttons.component';
import {ImageSlotEditorComponent} from './image-slot-editor.component';

/**
 * Manages the two images of a before/after section: the primary image is the "before" picture and the single
 * gallery image is the "after" picture. Both are chosen first and saved together with one button.
 */
@Component({
  selector: 'mvo-before-after-editor',
  imports: [ImageSlotEditorComponent],
  template: `
    <p class="adm-hint">
      Vælg to billeder af det samme sted: et taget før arbejdet og et efter. På hjemmesiden kan besøgende trække i en skyder for at sammenligne dem.
    </p>

    <div class="adm-pair">
      <section class="adm-pair__item">
        <mvo-image-slot-editor label="Før-billede" hint="Vises til venstre i skyderen." [url]="beforeUrl()" [pending]="!!before()"
                               [busy]="busy()" (chosen)="before.set($event)" />
      </section>
      <section class="adm-pair__item">
        <mvo-image-slot-editor label="Efter-billede" hint="Vises til højre i skyderen." [url]="afterUrl()" [pending]="!!after()"
                               [busy]="busy()" (chosen)="after.set($event)" />
      </section>
    </div>

    <div class="adm-savebar">
      <button type="button" class="adm-btn adm-btn--primary" (click)="save()" [disabled]="!dirty() || busy()">{{ busy() ? 'Gemmer…' : 'Gem ændringer' }}</button>
      <button type="button" class="adm-btn" (click)="reset()" [disabled]="!dirty() || busy()">Fortryd</button>
      @if (dirty()) { <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span> }
    </div>
  `,
})
export class BeforeAfterEditorComponent {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The section as it would look with the unsaved images, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly busy = signal(false);
  protected readonly before = signal<IChosenImage | null>(null);
  protected readonly after = signal<IChosenImage | null>(null);
  protected readonly dirty = computed(() => this.before() !== null || this.after() !== null);
  protected readonly beforeUrl = computed(() => this.before()?.url ?? this.section().primaryImage?.url ?? null);
  protected readonly afterUrl = computed(() => this.after()?.url ?? this.section().gallery[0]?.url ?? null);

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
    effect(() => {
      const s = this.section();
      const b = this.before();
      const a = this.after();
      this.draftChange.emit({
        ...s,
        primaryImage: b ? {mediaId: b.mediaId, url: b.url, altText: b.defaultAltText} : s.primaryImage,
        gallery: a ? [{id: -1, mediaId: a.mediaId, url: a.url, altText: a.defaultAltText, position: 1}] : s.gallery,
      });
    });
  }

  protected reset(): void {
    this.before.set(null);
    this.after.set(null);
  }

  /** Saves the before image, then the after image, each with the version the previous step returned. */
  protected save(): void {
    const s = this.section();
    const b = this.before();
    const a = this.after();
    this.busy.set(true);
    const saveBefore: Observable<ISectionContent> = b
      ? this.api.setPrimaryImage(s.pageId, s.id, s.version, b.mediaId, b.defaultAltText)
      : of(s);
    saveBefore.pipe(
      switchMap(current => (a ? this.api.setGallery(s.pageId, s.id, current.version, [{mediaId: a.mediaId, altText: a.defaultAltText}]) : of(current))),
    ).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Før- og efter-billederne er gemt.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.notify.emit({kind: 'error', text: `Billederne blev ikke gemt. ${error.message} Genindlæs sektionen, hvis kun det ene billede blev gemt.`});
      },
    });
  }
}
