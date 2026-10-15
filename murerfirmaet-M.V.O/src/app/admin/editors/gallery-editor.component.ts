import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, ElementRef, HostListener, computed, effect, inject, input, output, signal} from '@angular/core';
import {AdminApiService} from '../admin-api.service';
import {ALLOWED_IMAGE_TYPES, IApiError, IGalleryImage, INotice, ISectionContent} from '../admin.models';
import {MediaPickerService} from '../media/media-picker.component';
import {MediaUploadService, takeFiles} from '../media/media-upload.service';

/** A gallery image as edited here: saved images keep their alt text, new ones bring the library's default text. */
interface IDraftImage {
  key: string;
  mediaId: number;
  url: string;
  altText: string | null;
}

let nextKey = 0;

/**
 * Adds, removes, replaces and reorders gallery images locally. Nothing is saved until "Gem ændringer",
 * which stores the whole gallery in one request.
 */
@Component({
  selector: 'mvo-gallery-editor',
  imports: [CdkDropList, CdkDrag],
  template: `
    <p class="adm-hint">Træk billederne for at ændre rækkefølgen, eller brug pilene under hvert billede. Rækkefølgen her er den, besøgende ser.</p>

    <div class="adm-actions" style="margin-top: 0">
      <div class="adm-menu">
        <button type="button" class="adm-btn" aria-haspopup="menu" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())"
                [disabled]="busy()">Tilføj billeder ▾</button>
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
    </div>
    @for (e of messages(); track e) { <p class="adm-error" role="alert">{{ e }}</p> }

    <p class="adm-visually-hidden" aria-live="polite">{{ announcement() }}</p>

    @if (items().length === 0) {
      <div class="adm-empty" style="margin-top: 1rem">Galleriet er tomt. Tilføj billeder for at vise dem i sektionen.</div>
    } @else {
      <ol class="adm-gallery" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="drop($event)">
        @for (img of items(); track img.key; let i = $index; let first = $first; let last = $last) {
          <li class="adm-gallery__item" cdkDrag [cdkDragDisabled]="busy()">
            <span class="adm-gallery__pos">{{ i + 1 }}</span>
            <img [src]="img.url" [alt]="'Galleribillede ' + (i + 1)" draggable="false">
            <div class="adm-gallery__tools">
              <button type="button" class="adm-btn adm-btn--small" (click)="move(i, -1)" [disabled]="first || busy()" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' tidligere'">←</button>
              <button type="button" class="adm-btn adm-btn--small" (click)="move(i, 1)" [disabled]="last || busy()" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' senere'">→</button>
              <button type="button" class="adm-btn adm-btn--small" (click)="replace(i)" [disabled]="busy()">Udskift</button>
              <button type="button" class="adm-btn adm-btn--small adm-btn--danger" (click)="remove(i)" [disabled]="busy()">Fjern</button>
            </div>
          </li>
        }
      </ol>
    }

    <div class="adm-savebar">
      <button type="button" class="adm-btn adm-btn--primary" (click)="save()" [disabled]="!dirty() || busy()">{{ busy() ? 'Gemmer…' : 'Gem ændringer' }}</button>
      <button type="button" class="adm-btn" (click)="reset()" [disabled]="!dirty() || busy()">Fortryd</button>
      @if (dirty()) { <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span> }
    </div>
  `,
})
export class GalleryEditorComponent {
  private readonly api = inject(AdminApiService);
  private readonly picker = inject(MediaPickerService);
  private readonly uploads = inject(MediaUploadService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The section as it would look with the unsaved gallery, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly items = signal<IDraftImage[]>([]);
  protected readonly busy = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly announcement = signal('');
  protected readonly menuOpen = signal(false);

  protected readonly dirty = computed(() =>
    this.items().map(i => i.mediaId).join() !== this.saved().map(g => g.mediaId).join());
  private readonly saved = computed(() => [...this.section().gallery].sort((a, b) => a.position - b.position));

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
    effect(() => {
      const gallery: IGalleryImage[] = this.items().map((i, index) => ({
        id: -1 - index, mediaId: i.mediaId, url: i.url, altText: i.altText, position: index + 1,
      }));
      this.draftChange.emit({...this.section(), gallery});
    });
  }

  @HostListener('document:click', ['$event'])
  protected closeMenuOutside(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.querySelector('.adm-menu')?.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected reset(): void {
    this.items.set(this.saved().map(g => ({key: `k${nextKey++}`, mediaId: g.mediaId, url: g.url, altText: g.altText})));
    this.messages.set([]);
  }

  protected drop(event: CdkDragDrop<IDraftImage[]>): void {
    this.moveTo(event.previousIndex, event.currentIndex);
  }

  protected move(index: number, delta: number): void {
    this.moveTo(index, index + delta);
  }

  protected remove(index: number): void {
    this.items.update(items => items.filter((_, i) => i !== index));
    this.announcement.set(`Billede ${index + 1} er fjernet. Husk at gemme.`);
  }

  protected async replace(index: number): Promise<void> {
    const [item] = await this.picker.pick({
      title: 'Udskift billede',
      context: `Billede ${index + 1} i galleriet · Placeringen bevares`,
      multiple: false,
      confirmLabel: () => 'Udskift billede',
    });
    if (!item || item.id === this.items()[index]?.mediaId) return;
    if (this.items().some(i => i.mediaId === item.id)) {
      this.messages.set([`"${item.name}" er allerede i galleriet.`]);
      return;
    }
    this.messages.set([]);
    this.items.update(items => items.map((img, i) =>
      (i === index ? {key: `k${nextKey++}`, mediaId: item.id, url: item.url, altText: item.defaultAltText} : img)));
  }

  protected async addFromLibrary(): Promise<void> {
    this.menuOpen.set(false);
    const items = await this.picker.pick({
      title: 'Vælg billeder til galleriet',
      context: `${this.section().title} · Billederne tilføjes sidst i galleriet`,
      multiple: true,
      confirmLabel: n => (n === 1 ? 'Tilføj 1 billede' : `Tilføj ${n} billeder`),
    });
    this.append(items.map(i => ({mediaId: i.id, url: i.url, altText: i.defaultAltText, name: i.name})));
  }

  protected async addFromDevice(event: Event): Promise<void> {
    this.menuOpen.set(false);
    const media = await this.uploads.upload(takeFiles(event));
    this.append(media.map(m => ({mediaId: m.id, url: m.url, altText: null, name: m.name})));
  }

  protected save(): void {
    const s = this.section();
    this.busy.set(true);
    this.api.setGallery(s.pageId, s.id, s.version, this.items().map(i => ({mediaId: i.mediaId, altText: i.altText}))).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Galleriet er gemt.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.notify.emit({
          kind: 'error',
          text: error.status === 409
            ? `Galleriet blev ikke gemt. ${error.message.includes('changed') ? 'Indholdet er ændret af en anden. Genindlæs sektionen og prøv igen.' : error.message}`
            : `Galleriet blev ikke gemt. ${error.message}`,
        });
      },
    });
  }

  /** Adds images at the end of the gallery. Images already in it are skipped. */
  private append(images: {mediaId: number; url: string; altText: string | null; name: string}[]): void {
    if (!images.length) return;
    const existing = new Set(this.items().map(i => i.mediaId));
    this.messages.set(images.filter(i => existing.has(i.mediaId)).map(i => `"${i.name}" er allerede i galleriet og blev sprunget over.`));
    const fresh = images.filter(i => !existing.has(i.mediaId));
    this.items.update(items => [...items, ...fresh.map(i => ({key: `k${nextKey++}`, mediaId: i.mediaId, url: i.url, altText: i.altText}))]);
    if (fresh.length) this.announcement.set(`${fresh.length} billede(r) tilføjet sidst i galleriet. Husk at gemme.`);
  }

  private moveTo(from: number, to: number): void {
    if (to < 0 || to >= this.items().length || from === to) return;
    const next = [...this.items()];
    moveItemInArray(next, from, to);
    this.items.set(next);
    this.announcement.set(`Billede flyttet fra plads ${from + 1} til plads ${to + 1}. Husk at gemme.`);
  }
}
