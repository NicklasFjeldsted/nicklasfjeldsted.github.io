import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, ElementRef, HostListener, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {ALLOWED_IMAGE_TYPES, IApiError, IGalleryImage, IGalleryImageInput, INotice, ISectionContent} from '../admin.models';
import {MediaPickerService} from '../media/media-picker.component';
import {MediaUploadService, takeFiles} from '../media/media-upload.service';

@Component({
  selector: 'mvo-gallery-editor',
  imports: [CdkDropList, CdkDrag, FormsModule],
  template: `
    <p class="adm-hint">Træk billederne for at ændre rækkefølgen, eller brug knapperne under hvert billede. Rækkefølgen her er den, besøgende ser.</p>

    <div class="adm-actions" style="margin-top: 0">
      <div class="adm-menu">
        <button type="button" class="adm-btn" aria-haspopup="menu" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())"
                [disabled]="locked()">Tilføj billeder ▾</button>
        @if (menuOpen()) {
          <div class="adm-menu__list" role="menu">
            <button type="button" role="menuitem" class="adm-menu__item" (click)="addFromLibrary()">
              Vælg fra billedarkivet<small>Genbrug billeder, der allerede er uploadet</small>
            </button>
            <label role="menuitem" class="adm-menu__item" tabindex="0" (keydown.enter)="fileInput.click()">
              Upload fra denne enhed<small>Gemmes også i billedarkivet</small>
              <input #fileInput type="file" class="adm-visually-hidden" multiple [accept]="accept" (change)="addFromDevice($event)">
            </label>
          </div>
        }
      </div>
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
                <button type="button" class="adm-btn adm-btn--small" (click)="replace(img, i)" [disabled]="locked()">Udskift</button>
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
  private readonly picker = inject(MediaPickerService);
  private readonly uploads = inject(MediaUploadService);
  private readonly host = inject(ElementRef<HTMLElement>);

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
  protected readonly menuOpen = signal(false);

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

  @HostListener('document:click', ['$event'])
  protected closeMenuOutside(event: MouseEvent): void {
    if (this.menuOpen() && !(this.host.nativeElement as HTMLElement).querySelector('.adm-menu')?.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
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
      message: `Billede ${index + 1} fjernes fra galleriet. Billedet bliver liggende i billedarkivet.`,
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

  protected async replace(img: IGalleryImage, index: number): Promise<void> {
    const [item] = await this.picker.pick({
      title: 'Udskift billede',
      context: `Billede ${index + 1} i galleriet · Placeringen bevares`,
      multiple: false,
      confirmLabel: () => 'Udskift billede',
    });
    if (!item || item.id === img.mediaId) return;
    if (this.section().gallery.some(g => g.mediaId === item.id)) {
      this.fileErrors.set([`"${item.name}" er allerede i galleriet.`]);
      return;
    }
    const s = this.section();
    this.busy.set(true);
    this.api.replaceGalleryImage(s.pageId, s.id, s.version, img.id, item.id, img.altText ?? item.defaultAltText).subscribe({
      next: updated => this.done(updated, 'Billedet er udskiftet. Placeringen er bevaret.'),
      error: (e: IApiError) => this.failed('Billedet blev ikke udskiftet.', e),
    });
  }

  protected async addFromLibrary(): Promise<void> {
    this.menuOpen.set(false);
    const items = await this.picker.pick({
      title: 'Vælg billeder til galleriet',
      context: `${this.section().title} · Billederne tilføjes sidst i galleriet`,
      multiple: true,
      confirmLabel: n => (n === 1 ? 'Tilføj 1 billede' : `Tilføj ${n} billeder`),
    });
    this.addToGallery(items.map(i => ({mediaId: i.id, altText: i.defaultAltText, name: i.name})));
  }

  protected async addFromDevice(event: Event): Promise<void> {
    this.menuOpen.set(false);
    const media = await this.uploads.upload(takeFiles(event));
    this.addToGallery(media.map(m => ({mediaId: m.id, altText: null, name: m.name})));
  }

  /** Adds library images at the end of the gallery. Images already in this gallery are skipped. */
  private addToGallery(images: (IGalleryImageInput & {name: string})[]): void {
    if (!images.length) return;
    const existing = new Set(this.section().gallery.map(g => g.mediaId));
    const duplicates = images.filter(i => existing.has(i.mediaId)).map(i => `"${i.name}" er allerede i galleriet og blev sprunget over.`);
    const inputs = images.filter(i => !existing.has(i.mediaId)).map(i => ({mediaId: i.mediaId, altText: i.altText}));
    this.fileErrors.set(duplicates);
    if (!inputs.length) return;
    const s = this.section();
    this.busy.set(true);
    this.api.addGalleryImages(s.pageId, s.id, s.version, inputs).subscribe({
      next: updated => this.done(updated, inputs.length === 1
        ? '1 billede tilføjet sidst i galleriet.'
        : `${inputs.length} billeder tilføjet sidst i galleriet.`),
      error: (e: IApiError) => this.failed('Billederne blev ikke tilføjet.', e),
    });
  }

  private reorderLocal(from: number, to: number): void {
    if (to < 0 || to >= this.items().length || from === to) return;
    const next = [...this.items()];
    moveItemInArray(next, from, to);
    this.items.set(next);
    this.announcement.set(`Billede flyttet fra plads ${from + 1} til plads ${to + 1}. Husk at gemme rækkefølgen.`);
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
