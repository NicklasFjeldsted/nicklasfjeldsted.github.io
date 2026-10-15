import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {IMasonryImage} from '../../core/interfaces/masonry-page.interface';
import {BeforeAfterComponent} from '../../shared/components/before-after/before-after.component';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, ISectionContent} from '../admin.models';
import {ISlotImage, ISlotSave, ImageSlotEditorComponent} from './image-slot-editor.component';

/**
 * Manages the two images of a before/after section: the primary image is the "before" picture and the single
 * gallery image is the "after" picture. Each side is saved on its own, so a failure never loses the other side.
 */
@Component({
  selector: 'mvo-before-after-editor',
  imports: [ImageSlotEditorComponent, BeforeAfterComponent],
  template: `
    <p class="adm-hint">
      Vælg to billeder af det samme sted: et taget før arbejdet og et efter. På hjemmesiden kan besøgende trække i en skyder for at sammenligne dem.
    </p>

    <div class="adm-pair">
      <section>
        <mvo-image-slot-editor id="before" label="Før-billede" hint="Vises til venstre i skyderen." [current]="before()"
                               [busy]="busy()" (save)="saveBefore($event)" (dirtyChange)="beforeDirty.set($event)" />
      </section>
      <section>
        <mvo-image-slot-editor id="after" label="Efter-billede" hint="Vises til højre i skyderen." [current]="after()"
                               [busy]="busy()" (save)="saveAfter($event)" (dirtyChange)="afterDirty.set($event)" />
      </section>
    </div>

    @if (previewBefore(); as b) {
      @if (previewAfter(); as a) {
        <h3>Sådan ser det ud på siden</h3>
        <div class="adm-ba-preview"><mvo-before-after [before]="b" [after]="a" /></div>
      }
    }
  `,
})
export class BeforeAfterEditorComponent {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  readonly notify = output<INotice>();

  protected readonly busy = signal(false);
  protected readonly beforeDirty = signal(false);
  protected readonly afterDirty = signal(false);

  protected readonly before = computed<ISlotImage | null>(() => {
    const p = this.section().primaryImage;
    return p ? {url: p.url, altText: p.altText, key: `${p.mediaId}|${p.altText ?? ''}`} : null;
  });
  protected readonly after = computed<ISlotImage | null>(() => {
    const g = this.section().gallery[0];
    return g ? {url: g.url, altText: g.altText, key: `${g.id}|${g.mediaId}|${g.altText ?? ''}`} : null;
  });
  protected readonly previewBefore = computed<IMasonryImage | null>(() => this.toImage('before', this.before()));
  protected readonly previewAfter = computed<IMasonryImage | null>(() => this.toImage('after', this.after()));

  constructor() {
    // The admin page tracks unsaved changes with a single flag per editor.
    effect(() => this.dirtyChange.emit(this.beforeDirty() || this.afterDirty()));
  }

  protected saveBefore(save: ISlotSave): void {
    const s = this.section();
    this.persist(save, s.primaryImage?.mediaId ?? null, 'Før-billedet',
      mediaId => this.api.setPrimaryImage(s.pageId, s.id, s.version, mediaId, save.altText));
  }

  protected saveAfter(save: ISlotSave): void {
    const s = this.section();
    const existing = s.gallery[0];
    this.persist(save, existing?.mediaId ?? null, 'Efter-billedet', mediaId => existing
      ? this.api.replaceGalleryImage(s.pageId, s.id, s.version, existing.id, mediaId, save.altText)
      : this.api.addGalleryImages(s.pageId, s.id, s.version, [{mediaId, altText: save.altText}]));
  }

  private persist(save: ISlotSave, currentMediaId: number | null, name: string, attach: (mediaId: number) => Observable<ISectionContent>): void {
    const run = (mediaId: number, uploaded: boolean) =>
      attach(mediaId).subscribe({
        next: updated => {
          this.busy.set(false);
          this.sectionChange.emit(updated);
          this.notify.emit({kind: 'success', text: `${name} er gemt.`});
        },
        error: (error: IApiError) => {
          this.busy.set(false);
          if (uploaded) this.api.deleteMedia(mediaId).subscribe({error: () => undefined});
          this.notify.emit({kind: 'error', text: `${name} blev ikke gemt. ${error.message}`});
        },
      });

    this.busy.set(true);
    if (save.file) {
      this.api.uploadMedia(save.file).subscribe({
        next: media => run(media.id, true),
        error: (error: IApiError) => {
          this.busy.set(false);
          this.notify.emit({kind: 'error', text: `Billedet kunne ikke uploades. ${error.message}`});
        },
      });
    } else if (currentMediaId !== null) {
      run(currentMediaId, false);
    } else {
      this.busy.set(false);
    }
  }

  private toImage(id: string, slot: ISlotImage | null): IMasonryImage | null {
    return slot ? {id, url: slot.url, alt: slot.altText ?? ''} : null;
  }
}
