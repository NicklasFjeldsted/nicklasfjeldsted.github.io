import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {forkJoin, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {AdminApiService} from '../admin-api.service';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {
  ALLOWED_IMAGE_TYPES, IApiError, IGalleryImage, IGalleryImageInput, IMedia, INotice, ISectionContent, MAX_IMAGE_BYTES,
} from '../admin.models';

@Component({
  selector: 'mvo-gallery-editor',
  imports: [CdkDropList, CdkDrag, FormsModule],
  template: `
    <p class="adm-hint">Træk billederne for at ændre rækkefølgen, eller brug knapperne under hvert billede. Rækkefølgen her er den, besøgende ser.</p>

    <div class="adm-actions" style="margin-top: 0">
      <label class="adm-btn" [class.adm-btn--disabled]="locked()">
        Tilføj billeder
        <input type="file" class="adm-visually-hidden" multiple [accept]="accept" [disabled]="locked()" (change)="add($event)">
      </label>
      @if (orderDirty()) {
        <button type="button" class="adm-btn adm-btn--primary" (click)="saveOrder()" [disabled]="busy()">{{ busy() ? 'Gemmer…' : 'Gem rækkefølge' }}</button>
        <button type="button" class="adm-btn" (click)="resetOrder()" [disabled]="busy()">Fortryd rækkefølge</button>
        <span class="adm-badge adm-badge--unsaved">Ugemt rækkefølge</span>
      }
      @if (busy() && !orderDirty()) { <span class="adm-hint" role="status">Arbejder…</span> }
    </div>
    @if (orderDirty()) { <p class="adm-hint">Gem eller fortryd rækkefølgen, før du tilføjer, fjerner eller udskifter billeder.</p> }
    @for (e of fileErrors(); track e) { <p class="adm-error" role="alert">{{ e }}</p> }

    <p class="adm-visually-hidden" aria-live="polite">{{ announcement() }}</p>

    @if (items().length === 0) {
      <div class="adm-empty">Galleriet er tomt. Tilføj billeder for at vise dem i sektionen.</div>
    } @else {
      <ol class="adm-gallery" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="drop($event)">
        @for (img of items(); track img.id; let i = $index; let first = $first; let last = $last) {
          <li class="adm-gallery__item" cdkDrag [cdkDragDisabled]="busy()">
            <span class="adm-gallery__pos">{{ i + 1 }}</span>
            <img [src]="img.url" [alt]="img.altText || 'Galleribillede ' + (i + 1) + ' uden alternativ tekst'" draggable="false">
            @if (editingId() === img.id) {
              <div class="adm-field">
                <label [for]="'alt-' + img.id">Alternativ tekst</label>
                <input [id]="'alt-' + img.id" class="adm-input" [ngModel]="editAlt()" (ngModelChange)="editAlt.set($event)" maxlength="300" autocomplete="off">
              </div>
              <div class="adm-actions" style="margin: 0">
                <button type="button" class="adm-btn adm-btn--small adm-btn--primary" (click)="saveAlt(img)" [disabled]="busy()">Gem</button>
                <button type="button" class="adm-btn adm-btn--small" (click)="editingId.set(null)">Annullér</button>
              </div>
            } @else {
              <p class="adm-gallery__alt">{{ img.altText || 'Ingen alternativ tekst' }}</p>
              <div class="adm-gallery__tools">
                <button type="button" class="adm-btn adm-btn--small" (click)="move(i, -1)" [disabled]="first || busy()" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' tidligere'">←</button>
                <button type="button" class="adm-btn adm-btn--small" (click)="move(i, 1)" [disabled]="last || busy()" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' senere'">→</button>
                <button type="button" class="adm-btn adm-btn--small" (click)="startEdit(img)" [disabled]="locked()">Alt-tekst</button>
                <label class="adm-btn adm-btn--small" [class.adm-btn--disabled]="locked()">
                  Udskift
                  <input type="file" class="adm-visually-hidden" [accept]="accept" [disabled]="locked()" (change)="replace($event, img)">
                </label>
                <button type="button" class="adm-btn adm-btn--small adm-btn--danger" (click)="remove(img, i)" [disabled]="locked()">Fjern</button>
              </div>
            }
          </li>
        }
      </ol>
    }
  `,
})
export class GalleryEditorComponent {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  readonly notify = output<INotice>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly items = signal<IGalleryImage[]>([]);
  protected readonly busy = signal(false);
  protected readonly fileErrors = signal<string[]>([]);
  protected readonly announcement = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly editAlt = signal('');

  protected readonly orderDirty = computed(() => {
    const saved = this.section().gallery.map(g => g.id).join();
    return this.items().map(g => g.id).join() !== saved;
  });
  protected readonly locked = computed(() => this.busy() || this.orderDirty());

  constructor() {
    effect(() => {
      this.items.set([...this.section().gallery].sort((a, b) => a.position - b.position));
      this.editingId.set(null);
    });
    effect(() => this.dirtyChange.emit(this.orderDirty() || this.editingId() !== null));
  }

  protected drop(event: CdkDragDrop<IGalleryImage[]>): void {
    this.reorderLocal(event.previousIndex, event.currentIndex);
  }

  protected move(index: number, delta: number): void {
    this.reorderLocal(index, index + delta);
  }

  protected resetOrder(): void {
    this.items.set([...this.section().gallery].sort((a, b) => a.position - b.position));
    this.announcement.set('Rækkefølgen er nulstillet.');
  }

  protected saveOrder(): void {
    const s = this.section();
    this.busy.set(true);
    this.api.reorderGallery(s.pageId, s.id, s.version, this.items().map(g => g.id)).subscribe({
      next: updated => this.done(updated, 'Galleriets rækkefølge er gemt.'),
      error: (e: IApiError) => this.failed('Rækkefølgen blev ikke gemt.', e),
    });
  }

  protected startEdit(img: IGalleryImage): void {
    this.editingId.set(img.id);
    this.editAlt.set(img.altText ?? '');
  }

  protected saveAlt(img: IGalleryImage): void {
    const s = this.section();
    this.busy.set(true);
    this.api.replaceGalleryImage(s.pageId, s.id, s.version, img.id, img.mediaId, this.editAlt().trim() || null).subscribe({
      next: updated => this.done(updated, 'Alternativ tekst er gemt.'),
      error: (e: IApiError) => this.failed('Alternativ tekst blev ikke gemt.', e),
    });
  }

  protected async remove(img: IGalleryImage, index: number): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Fjern billedet fra galleriet?',
      message: `Billede ${index + 1} fjernes fra galleriet. Selve billedfilen slettes ikke fra mediebiblioteket.`,
      confirmLabel: 'Fjern fra galleri',
      destructive: true,
    });
    if (!ok) return;
    const s = this.section();
    this.busy.set(true);
    this.api.removeGalleryImage(s.pageId, s.id, s.version, img.id).subscribe({
      next: updated => this.done(updated, 'Billedet er fjernet fra galleriet.'),
      error: (e: IApiError) => this.failed('Billedet blev ikke fjernet.', e),
    });
  }

  protected replace(event: Event, img: IGalleryImage): void {
    const file = this.takeFiles(event)[0];
    if (!file || !this.validate([file])) return;
    const s = this.section();
    this.busy.set(true);
    this.api.uploadMedia(file).subscribe({
      next: media => this.api.replaceGalleryImage(s.pageId, s.id, s.version, img.id, media.id, img.altText).subscribe({
        next: updated => this.done(updated, 'Billedet er udskiftet. Placeringen er bevaret.'),
        error: (e: IApiError) => {
          this.api.deleteMedia(media.id).subscribe({error: () => undefined});
          this.failed('Billedet blev ikke udskiftet.', e);
        },
      }),
      error: (e: IApiError) => this.failed('Billedet kunne ikke uploades.', e),
    });
  }

  protected add(event: Event): void {
    const files = this.validate(this.takeFiles(event));
    if (!files.length) return;
    const s = this.section();
    this.busy.set(true);
    forkJoin(files.map(f => this.api.uploadMedia(f).pipe(
      map(media => ({media, error: null as IApiError | null, name: f.name})),
      catchError((error: IApiError) => of({media: null as IMedia | null, error, name: f.name})),
    ))).subscribe(results => {
      const uploaded = results.filter(r => r.media);
      const errors = results.filter(r => r.error).map(r => `${r.name}: ${r.error!.message}`);
      this.fileErrors.set(errors);
      if (!uploaded.length) {
        this.busy.set(false);
        this.notify.emit({kind: 'error', text: 'Ingen billeder blev tilføjet.'});
        return;
      }
      const inputs: IGalleryImageInput[] = uploaded.map(r => ({mediaId: r.media!.id, altText: null}));
      this.api.addGalleryImages(s.pageId, s.id, s.version, inputs).subscribe({
        next: updated => this.done(updated, errors.length
          ? `${uploaded.length} billede(r) tilføjet. ${errors.length} kunne ikke uploades.`
          : `${uploaded.length} billede(r) tilføjet. Husk at tilføje alternativ tekst.`),
        error: (e: IApiError) => {
          uploaded.forEach(r => this.api.deleteMedia(r.media!.id).subscribe({error: () => undefined}));
          this.failed('Billederne blev ikke tilføjet.', e);
        },
      });
    });
  }

  private reorderLocal(from: number, to: number): void {
    if (to < 0 || to >= this.items().length || from === to) return;
    const next = [...this.items()];
    moveItemInArray(next, from, to);
    this.items.set(next);
    this.announcement.set(`Billede flyttet fra plads ${from + 1} til plads ${to + 1}. Husk at gemme rækkefølgen.`);
  }

  private takeFiles(event: Event): File[] {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    return files;
  }

  private validate(files: File[]): File[] {
    const allowed = ALLOWED_IMAGE_TYPES.split(',');
    const errors: string[] = [];
    const ok = files.filter(f => {
      if (!allowed.includes(f.type)) { errors.push(`${f.name}: filtypen understøttes ikke (brug JPEG, PNG eller WebP).`); return false; }
      if (f.size > MAX_IMAGE_BYTES) { errors.push(`${f.name}: filen er større end 10 MB.`); return false; }
      return true;
    });
    this.fileErrors.set(errors);
    return ok;
  }

  private done(updated: ISectionContent, text: string): void {
    this.busy.set(false);
    this.sectionChange.emit(updated);
    this.announcement.set(text);
    this.notify.emit({kind: 'success', text});
  }

  private failed(prefix: string, error: IApiError): void {
    this.busy.set(false);
    this.notify.emit({
      kind: 'error',
      text: error.status === 409
        ? `${prefix} Indholdet er ændret af en anden. Genindlæs sektionen og prøv igen.`
        : `${prefix} ${error.message}`,
    });
  }
}
