import {Component, DestroyRef, computed, effect, inject, input, model, output, signal, untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {ALLOWED_IMAGE_TYPES, IApiError, IMedia, IMediaItem, MediaFilter, MediaSort} from '../admin.models';
import {MediaUploadService, takeFiles} from './media-upload.service';

const PAGE_SIZE = 48;

/**
 * Search, filter and browse the image library, with an upload area that accepts dropped files.
 * `manage` mode highlights one image (the library page shows its details); `pick` mode toggles a selection.
 */
@Component({
  selector: 'mvo-media-browser',
  imports: [FormsModule],
  template: `
    <div class="lib-drop" [class.lib-drop--over]="dragOver()" (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
      <strong>{{ mode() === 'pick' ? 'Upload nye billeder' : 'Upload billeder' }}</strong> – træk filer hertil eller
      <label class="lib-drop__pick">vælg fra enheden<input type="file" class="adm-visually-hidden" multiple [accept]="accept" (change)="onPick($event)"></label>{{
        mode() === 'pick' ? '. De lægges i arkivet og bliver valgt med det samme.' : ' (JPEG, PNG, WebP, maks. 10 MB pr. billede)' }}
    </div>

    <div class="lib-toolbar" role="search">
      <label class="adm-visually-hidden" [for]="id() + '-search'">Søg i billedarkivet</label>
      <input [id]="id() + '-search'" type="search" class="adm-input lib-search" placeholder="Søg på navn, filnavn eller alt-tekst …"
             [ngModel]="search()" (ngModelChange)="search.set($event)" autocomplete="off">
      <label class="adm-visually-hidden" [for]="id() + '-filter'">Vis</label>
      <select [id]="id() + '-filter'" class="adm-input" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
        <option value="all">Alle billeder</option>
        <option value="used">I brug på siden</option>
        <option value="unused">Ikke i brug</option>
      </select>
      <label class="adm-visually-hidden" [for]="id() + '-sort'">Sortér</label>
      <select [id]="id() + '-sort'" class="adm-input" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
        <option value="newest">Nyeste først</option>
        <option value="oldest">Ældste først</option>
        <option value="name">Navn A–Å</option>
      </select>
    </div>

    <p class="adm-visually-hidden" aria-live="polite">{{ loading() ? '' : total() + ' billeder fundet' }}</p>

    @if (error()) {
      <div class="adm-notice adm-notice--error" role="alert">
        <span>Billederne kunne ikke hentes. {{ error() }}</span>
        <button type="button" class="adm-btn adm-btn--small" (click)="reload()">Prøv igen</button>
      </div>
    } @else if (!loading() && items().length === 0) {
      <div class="adm-empty">{{ search().trim() || filter() !== 'all' ? 'Ingen billeder matcher søgningen.' : 'Billedarkivet er tomt. Upload det første billede ovenfor.' }}</div>
    } @else {
      <ul class="lib-grid">
        @for (item of items(); track item.id) {
          <li>
            <button type="button" class="lib-item" [attr.aria-pressed]="isSelected(item)" (click)="toggle(item)"
                    [attr.aria-label]="item.name + (item.usageCount ? ', i brug ' + item.usageCount + ' steder' : ', ikke i brug')">
              <img [src]="item.url" alt="" loading="lazy">
              @if (mode() === 'pick') { <span class="lib-check" aria-hidden="true">{{ isSelected(item) ? '✓' : '' }}</span> }
              @if (item.usageCount) { <span class="lib-used">I brug {{ item.usageCount }}×</span> }
              <span class="lib-item__name">{{ item.name }}</span>
              <small>{{ date(item.createdUtc) }} · {{ size(item.sizeBytes) }}</small>
            </button>
          </li>
        }
      </ul>
    }

    @if (loading()) { <p class="adm-hint" role="status">Henter billeder…</p> }
    @else if (items().length < total()) {
      <div class="lib-more"><button type="button" class="adm-btn" (click)="loadMore()">Vis flere ({{ total() - items().length }} tilbage)</button></div>
    }
  `,
})
export class MediaBrowserComponent {
  private readonly api = inject(AdminApiService);
  private readonly uploads = inject(MediaUploadService);

  readonly id = input('lib');
  readonly mode = input<'manage' | 'pick'>('manage');
  readonly multiple = input(true);
  /** Selected image ids in pick mode; the highlighted image (at most one) in manage mode. */
  readonly selected = model<number[]>([]);
  readonly itemClick = output<IMediaItem>();
  readonly uploaded = output<IMedia[]>();
  /** Every item the browser has loaded, so a picker can return full items for its selection. */
  readonly itemsChange = output<IMediaItem[]>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly search = signal('');
  protected readonly filter = signal<MediaFilter>('all');
  protected readonly sort = signal<MediaSort>('newest');
  protected readonly items = signal<IMediaItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly dragOver = signal(false);
  private readonly selectedSet = computed(() => new Set(this.selected()));
  private requestNo = 0;

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    effect(() => {
      this.search();
      this.filter();
      this.sort();
      clearTimeout(timer);
      // Typing waits a moment before searching; the first load starts right away.
      timer = setTimeout(() => untracked(() => this.reload()), first ? 0 : 250);
      first = false;
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => this.itemsChange.emit(this.items()));
  }

  /** Reloads the first page, keeping the current search. */
  reload(): void {
    this.fetch(0, PAGE_SIZE, false);
  }

  /** Updates one image in place (after a rename) without reloading the list. */
  patchItem(id: number, patch: Partial<IMediaItem>): void {
    this.items.update(items => items.map(i => (i.id === id ? {...i, ...patch} : i)));
  }

  removeItem(id: number): void {
    this.items.update(items => items.filter(i => i.id !== id));
    this.total.update(t => Math.max(0, t - 1));
    this.selected.update(ids => ids.filter(i => i !== id));
  }

  protected loadMore(): void {
    this.fetch(this.items().length, PAGE_SIZE, true);
  }

  protected isSelected(item: IMediaItem): boolean {
    return this.selectedSet().has(item.id);
  }

  protected toggle(item: IMediaItem): void {
    if (this.mode() === 'manage' || !this.multiple()) {
      this.selected.set(this.mode() === 'pick' && this.isSelected(item) ? [] : [item.id]);
    } else {
      this.selected.update(ids => (ids.includes(item.id) ? ids.filter(i => i !== item.id) : [...ids, item.id]));
    }
    this.itemClick.emit(item);
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    void this.startUpload(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onPick(event: Event): void {
    void this.startUpload(takeFiles(event));
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('da-DK', {day: 'numeric', month: 'short', year: 'numeric'});
  }

  protected size(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private async startUpload(files: File[]): Promise<void> {
    const uploaded = await this.uploads.upload(files);
    if (!uploaded.length) return;
    // New images are newest, so show them at the top with nothing filtered away.
    this.search.set('');
    this.filter.set('all');
    this.sort.set('newest');
    this.reload();
    const ids = uploaded.map(m => m.id);
    if (this.mode() === 'pick') this.selected.update(current => (this.multiple() ? [...new Set([...current, ...ids])] : [ids[0]]));
    else this.selected.set([ids[0]]);
    this.uploaded.emit(uploaded);
  }

  private fetch(skip: number, take: number, append: boolean): void {
    const no = ++this.requestNo;
    this.loading.set(true);
    this.error.set('');
    this.api.listMedia({search: this.search().trim(), filter: this.filter(), sort: this.sort(), skip, take}).subscribe({
      next: page => {
        if (no !== this.requestNo) return;
        this.loading.set(false);
        this.total.set(page.total);
        this.items.update(items => (append ? [...items, ...page.items.filter(n => !items.some(i => i.id === n.id))] : page.items));
      },
      error: (e: IApiError) => {
        if (no !== this.requestNo) return;
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }
}
