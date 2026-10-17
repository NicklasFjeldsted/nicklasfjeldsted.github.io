import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {AdminApiService} from '../admin-api.service';
import {ALLOWED_IMAGE_TYPES, IApiError, INotice, ISectionContent, SectionMedia} from '../admin.models';
import {IChosenImage} from '../media/image-source-buttons.component';
import {MediaPickerService} from '../media/media-picker.component';
import {MediaUploadService, takeFiles} from '../media/media-upload.service';
import {ImageSlotEditorComponent} from './image-slot-editor.component';

type TextPart = 'eyebrow' | 'introduction' | 'description' | 'additionalDescription';
type PartId = 'title' | TextPart | 'details' | 'images' | 'beforeAfter';

interface IPart {
  id: PartId;
  label: string;
  hint: string;
  icon: string;
}

/** The parts in the order they appear on the page (the design decides the order, not when a part was added). */
const PARTS: IPart[] = [
  {id: 'eyebrow', label: 'Overtekst', hint: 'Lille tekst over titlen', icon: 'Aa'},
  {id: 'introduction', label: 'Kort introduktion', hint: 'Fremhævet tekst under titlen', icon: '¶'},
  {id: 'description', label: 'Beskrivelse', hint: 'Brødtekst', icon: '≡'},
  {id: 'additionalDescription', label: 'Ekstra tekst', hint: 'Endnu et afsnit brødtekst', icon: '+≡'},
  {id: 'details', label: 'Punkter', hint: 'Vises som en liste', icon: '•'},
  {id: 'images', label: 'Billeder', hint: 'Første billede er det store', icon: '▣'},
  {id: 'beforeAfter', label: 'Før og efter', hint: 'Besøgende trækker i en skyder for at sammenligne', icon: '◧'},
];
const TITLE: IPart = {id: 'title', label: 'Titel', hint: 'Overskriften på sektionen', icon: 'T'};

const MAX_DETAILS = 20;
const MAX_IMAGES = 41;

interface IImage {
  key: string;
  mediaId: number;
  url: string;
}

/** Everything the editor holds. A text part that is null is not in the section; '' is added but still empty. */
interface IDraft {
  title: string;
  eyebrow: string | null;
  introduction: string | null;
  description: string | null;
  additionalDescription: string | null;
  details: string[] | null;
  media: SectionMedia;
  /** Images: the first is the main image, the rest the gallery. Before/after: [before, after], either may be missing. */
  images: (IImage | null)[];
}

let nextKey = 0;

/**
 * Edits a section as a stack of parts. A new section has only its title; the person adds the parts they need
 * (texts, points, images or a before/after pair) and removes the rest. Everything is saved with one button.
 */
@Component({
  selector: 'mvo-section-blocks-editor',
  imports: [ImageSlotEditorComponent],
  template: `
    @let d = draft();
    <div class="adm-blocks">
      @for (part of shownParts(); track part.id) {
        <section class="adm-block" [class.adm-block--new]="justAdded() === part.id" [attr.aria-label]="part.label">
          <header class="adm-block__head">
            <span class="adm-block__icon" aria-hidden="true">{{ part.icon }}</span>
            <h3>{{ part.label }}</h3>
            <span class="adm-hint">{{ part.hint }}</span>
            @if (part.id !== 'title') {
              <button type="button" class="adm-block__remove" (click)="removePart(part.id)" [disabled]="busy()" [attr.aria-label]="'Fjern ' + part.label">✕ Fjern</button>
            }
          </header>

          @switch (part.id) {
            @case ('title') {
              <input id="blk-title" class="adm-input" maxlength="200" autocomplete="off" [value]="d.title" (input)="setTitle($event)"
                     [attr.aria-invalid]="titleMissing()" aria-label="Titel">
              @if (titleMissing()) { <span class="adm-error">Skriv en titel.</span> }
            }
            @case ('eyebrow') {
              <input class="adm-input" maxlength="500" autocomplete="off" [value]="d.eyebrow" (input)="setText('eyebrow', $event)" aria-label="Overtekst">
            }
            @case ('details') {
              <div class="adm-block__points">
                @for (p of d.details; track $index; let i = $index) {
                  <div class="adm-block__point">
                    <input class="adm-input" maxlength="300" autocomplete="off" [value]="p" (input)="setDetail(i, $event)" [attr.aria-label]="'Punkt ' + (i + 1)">
                    <button type="button" class="adm-btn adm-btn--small" (click)="removeDetail(i)" [attr.aria-label]="'Fjern punkt ' + (i + 1)">Fjern</button>
                  </div>
                }
                <div><button type="button" class="adm-btn adm-btn--small" (click)="addDetail()" [disabled]="(d.details?.length ?? 0) >= maxDetails">+ Tilføj punkt</button></div>
              </div>
            }
            @case ('images') {
              <ol class="adm-block__thumbs">
                @for (img of d.images; track img!.key; let i = $index; let first = $first; let last = $last) {
                  <li [class.adm-block__thumb--main]="first">
                    <img [src]="img!.url" [alt]="first ? 'Hovedbillede' : 'Galleribillede ' + i">
                    <span class="adm-block__caption">{{ first ? 'Hovedbillede' : 'Galleri' }}</span>
                    <span class="adm-block__tools">
                      <button type="button" class="adm-btn adm-btn--small" (click)="moveImage(i, -1)" [disabled]="first" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' tidligere'">←</button>
                      <button type="button" class="adm-btn adm-btn--small" (click)="moveImage(i, 1)" [disabled]="last" [attr.aria-label]="'Flyt billede ' + (i + 1) + ' senere'">→</button>
                      <button type="button" class="adm-btn adm-btn--small adm-btn--danger" (click)="removeImage(i)" [attr.aria-label]="'Fjern billede ' + (i + 1)">✕</button>
                    </span>
                  </li>
                }
                <li class="adm-block__add-image">
                  <button type="button" class="adm-btn adm-btn--small" (click)="addFromLibrary()" [disabled]="busy()">+ Fra billedarkivet</button>
                  <label class="adm-btn adm-btn--small" [class.adm-btn--disabled]="busy()">
                    Upload nyt
                    <input type="file" class="adm-visually-hidden" multiple [accept]="accept" (change)="addFromDevice($event)" [disabled]="busy()">
                  </label>
                </li>
              </ol>
              @if (!d.images.length) { <p class="adm-hint">Ingen billeder endnu. Sektionen vises uden billeder, indtil du tilføjer nogle.</p> }
              @for (m of messages(); track m) { <p class="adm-error" role="alert">{{ m }}</p> }
            }
            @case ('beforeAfter') {
              <div class="adm-pair" style="margin-bottom: 0">
                <section class="adm-pair__item">
                  <mvo-image-slot-editor label="Før-billede" hint="Vises til venstre i skyderen." [url]="d.images[0]?.url ?? null"
                                         [pending]="pendingSlot(0)" [busy]="busy()" (chosen)="setSlot(0, $event)" />
                </section>
                <section class="adm-pair__item">
                  <mvo-image-slot-editor label="Efter-billede" hint="Vises til højre i skyderen." [url]="d.images[1]?.url ?? null"
                                         [pending]="pendingSlot(1)" [busy]="busy()" (chosen)="setSlot(1, $event)" />
                </section>
              </div>
            }
            @default {
              <textarea class="adm-input" maxlength="4000" rows="3" [value]="textOf(part.id)" (input)="setText(part.id, $event)" [attr.aria-label]="part.label"></textarea>
            }
          }
        </section>
      }
    </div>

    @if (missingParts().length) {
      <div class="adm-addparts">
        <h3>Tilføj til sektionen</h3>
        <div class="adm-addparts__list">
          @for (part of missingParts(); track part.id) {
            <button type="button" class="adm-addparts__chip" (click)="addPart(part.id)" [disabled]="busy() || !!blockedReason(part.id)"
                    [attr.title]="blockedReason(part.id)">
              <span class="adm-block__icon" aria-hidden="true">{{ part.icon }}</span>{{ part.label }}
            </button>
          }
        </div>
        @if (blockedHint(); as hint) { <p class="adm-hint">{{ hint }}</p> }
      </div>
    }

    <div class="adm-savebar">
      <button type="button" class="adm-btn adm-btn--primary" (click)="save()" [disabled]="!dirty() || busy()">{{ busy() ? 'Gemmer…' : 'Gem ændringer' }}</button>
      <button type="button" class="adm-btn" (click)="reset()" [disabled]="!dirty() || busy()">Fortryd</button>
      @if (dirty()) { <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span> }
    </div>
  `,
})
export class SectionBlocksEditorComponent {
  private readonly api = inject(AdminApiService);
  private readonly picker = inject(MediaPickerService);
  private readonly uploads = inject(MediaUploadService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The section as it would look with the unsaved changes, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;
  protected readonly maxDetails = MAX_DETAILS;
  protected readonly busy = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly justAdded = signal<PartId | null>(null);
  protected readonly titleMissing = signal(false);
  protected readonly draft = signal<IDraft>(emptyDraft());

  private readonly saved = computed(() => fromSection(this.section()));
  protected readonly dirty = computed(() => fingerprint(this.draft()) !== fingerprint(this.saved()));

  /** Every part the section has, in page order: the overtext sits above the title. */
  protected readonly shownParts = computed(() => {
    const d = this.draft();
    const parts = PARTS.filter(p => has(d, p.id));
    return [...parts.filter(p => p.id === 'eyebrow'), TITLE, ...parts.filter(p => p.id !== 'eyebrow')];
  });
  protected readonly missingParts = computed(() => PARTS.filter(p => !has(this.draft(), p.id)));
  protected readonly blockedHint = computed(() => {
    const media = this.draft().media;
    if (media === SectionMedia.Images) return 'Før og efter kan ikke bruges sammen med Billeder. Fjern Billeder først.';
    if (media === SectionMedia.BeforeAfter) return 'Billeder kan ikke bruges sammen med Før og efter. Fjern Før og efter først.';
    return null;
  });

  constructor() {
    effect(() => {
      this.section();
      this.reset();
    });
    effect(() => this.dirtyChange.emit(this.dirty()));
    effect(() => this.draftChange.emit(toSection(this.section(), this.draft())));
  }

  protected reset(): void {
    this.draft.set(this.saved());
    this.messages.set([]);
    this.justAdded.set(null);
    this.titleMissing.set(false);
  }

  protected textOf(id: PartId): string {
    return (this.draft()[id as TextPart] as string | null) ?? '';
  }

  protected blockedReason(id: PartId): string | null {
    const media = this.draft().media;
    if (id === 'beforeAfter' && media === SectionMedia.Images) return 'Fjern Billeder først';
    if (id === 'images' && media === SectionMedia.BeforeAfter) return 'Fjern Før og efter først';
    return null;
  }

  protected pendingSlot(index: number): boolean {
    const saved = this.saved().images[index];
    return this.draft().images[index]?.mediaId !== saved?.mediaId && !!this.draft().images[index];
  }

  protected addPart(id: PartId): void {
    if (this.blockedReason(id)) return;
    this.update(d => {
      if (id === 'details') return {...d, details: ['']};
      if (id === 'images') return {...d, media: SectionMedia.Images, images: []};
      if (id === 'beforeAfter') return {...d, media: SectionMedia.BeforeAfter, images: [null, null]};
      return {...d, [id]: ''};
    });
    this.justAdded.set(id);
  }

  protected removePart(id: PartId): void {
    this.update(d => {
      if (id === 'details') return {...d, details: null};
      if (id === 'images' || id === 'beforeAfter') return {...d, media: SectionMedia.None, images: []};
      return {...d, [id]: null};
    });
    this.messages.set([]);
  }

  protected setTitle(event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    this.update(d => ({...d, title}));
    if (title.trim()) this.titleMissing.set(false);
  }

  protected setText(id: PartId, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.update(d => ({...d, [id]: value}));
  }

  protected setDetail(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.update(d => ({...d, details: (d.details ?? []).map((p, i) => (i === index ? value : p))}));
  }

  protected addDetail(): void {
    this.update(d => ({...d, details: [...(d.details ?? []), '']}));
  }

  protected removeDetail(index: number): void {
    this.update(d => ({...d, details: (d.details ?? []).filter((_, i) => i !== index)}));
  }

  protected moveImage(index: number, delta: number): void {
    this.update(d => {
      const images = [...d.images];
      const target = index + delta;
      if (target < 0 || target >= images.length) return d;
      [images[index], images[target]] = [images[target], images[index]];
      return {...d, images};
    });
  }

  protected removeImage(index: number): void {
    this.update(d => ({...d, images: d.images.filter((_, i) => i !== index)}));
  }

  protected setSlot(index: number, chosen: IChosenImage): void {
    this.update(d => {
      const images = [...d.images];
      images[index] = {key: `k${nextKey++}`, mediaId: chosen.mediaId, url: chosen.url};
      return {...d, images};
    });
  }

  protected async addFromLibrary(): Promise<void> {
    const items = await this.picker.pick({
      title: 'Vælg billeder til sektionen',
      context: `${this.draft().title || this.section().title} · Billederne tilføjes sidst`,
      multiple: true,
      confirmLabel: n => (n === 1 ? 'Tilføj 1 billede' : `Tilføj ${n} billeder`),
    });
    this.append(items.map(i => ({mediaId: i.id, url: i.url, name: i.name})));
  }

  protected async addFromDevice(event: Event): Promise<void> {
    const media = await this.uploads.upload(takeFiles(event));
    this.append(media.map(m => ({mediaId: m.id, url: m.url, name: m.name})));
  }

  protected save(): void {
    const d = this.draft();
    if (!d.title.trim()) {
      this.titleMissing.set(true);
      document.getElementById('blk-title')?.focus();
      return;
    }
    if (d.media === SectionMedia.BeforeAfter && d.images.some(i => !i)) {
      this.notify.emit({kind: 'error', text: 'Vælg både et før- og et efter-billede, eller fjern Før og efter.'});
      return;
    }
    const s = this.section();
    const images = d.images.filter((i): i is IImage => !!i);
    this.busy.set(true);
    this.api.saveSectionContent(s.pageId, s.id, s.version, {
      title: d.title.trim(),
      eyebrow: clean(d.eyebrow),
      introduction: clean(d.introduction),
      description: clean(d.description),
      additionalDescription: clean(d.additionalDescription),
      details: (d.details ?? []).map(p => p.trim()).filter(p => p.length > 0),
      media: d.media,
      primaryMediaId: images[0]?.mediaId ?? null,
      galleryMediaIds: images.slice(1).map(i => i.mediaId),
    }).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Sektionen er gemt.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.notify.emit({
          kind: 'error',
          text: error.status === 409
            ? 'Indholdet er ændret et andet sted, siden du åbnede det. Dine ændringer er ikke gemt. Genindlæs sektionen og prøv igen.'
            : `Sektionen blev ikke gemt. ${error.message}`,
        });
      },
    });
  }

  private update(change: (d: IDraft) => IDraft): void {
    this.draft.update(change);
  }

  /** Adds images at the end. Images already in the section are skipped. */
  private append(images: {mediaId: number; url: string; name: string}[]): void {
    if (!images.length) return;
    const existing = new Set(this.draft().images.map(i => i?.mediaId));
    const fresh = images.filter(i => !existing.has(i.mediaId));
    const skipped = images.filter(i => existing.has(i.mediaId)).map(i => `"${i.name}" er allerede i sektionen og blev sprunget over.`);
    const room = MAX_IMAGES - this.draft().images.length;
    if (fresh.length > room) skipped.push(`Der er højst plads til ${MAX_IMAGES} billeder i en sektion.`);
    this.messages.set(skipped);
    this.update(d => ({...d, images: [...d.images, ...fresh.slice(0, room).map(i => ({key: `k${nextKey++}`, mediaId: i.mediaId, url: i.url}))]}));
  }
}

function has(d: IDraft, id: PartId): boolean {
  if (id === 'title') return true;
  if (id === 'details') return d.details !== null;
  if (id === 'images') return d.media === SectionMedia.Images;
  if (id === 'beforeAfter') return d.media === SectionMedia.BeforeAfter;
  return d[id] !== null;
}

function clean(value: string | null): string | null {
  return value?.trim() ? value.trim() : null;
}

function emptyDraft(): IDraft {
  return {title: '', eyebrow: null, introduction: null, description: null, additionalDescription: null, details: null, media: SectionMedia.None, images: []};
}

function mediaOf(s: ISectionContent): SectionMedia {
  if (s.sectionType === 'BeforeAfter') return SectionMedia.BeforeAfter;
  if (s.sectionType === 'MasonryShowcase') return SectionMedia.Images;
  return SectionMedia.None;
}

function fromSection(s: ISectionContent): IDraft {
  const media = mediaOf(s);
  const gallery = [...s.gallery].sort((a, b) => a.position - b.position).map(g => ({key: `s${g.mediaId}`, mediaId: g.mediaId, url: g.url}));
  const primary = s.primaryImage ? {key: `p${s.primaryImage.mediaId}`, mediaId: s.primaryImage.mediaId, url: s.primaryImage.url} : null;
  const images = media === SectionMedia.BeforeAfter
    ? [primary, gallery[0] ?? null]
    : media === SectionMedia.Images ? [primary, ...gallery].filter((i): i is IImage => !!i) : [];
  return {
    title: s.title,
    eyebrow: s.eyebrow,
    introduction: s.introduction,
    description: s.description ? s.description : null,
    additionalDescription: s.additionalDescription,
    details: s.details.length ? [...s.details] : null,
    media,
    images,
  };
}

/** Compares what would be saved, so typing and deleting the same text does not count as a change. */
function fingerprint(d: IDraft): string {
  return JSON.stringify({...d, images: d.images.map(i => i?.mediaId ?? null)});
}

/** The section as the public page would render it with these changes. */
function toSection(s: ISectionContent, d: IDraft): ISectionContent {
  const images = d.images;
  const sectionType = d.media === SectionMedia.BeforeAfter ? 'BeforeAfter' : d.media === SectionMedia.Images ? 'MasonryShowcase' : 'TextBlock';
  const primary = images[0];
  const gallery = d.media === SectionMedia.BeforeAfter ? images.slice(1, 2) : images.slice(1);
  return {
    ...s,
    sectionType,
    title: d.title,
    eyebrow: clean(d.eyebrow),
    introduction: clean(d.introduction),
    description: d.description?.trim() ?? '',
    additionalDescription: clean(d.additionalDescription),
    details: (d.details ?? []).map(p => p.trim()).filter(p => p.length > 0),
    primaryImage: primary ? {mediaId: primary.mediaId, url: primary.url, altText: null} : null,
    gallery: gallery.filter((g): g is IImage => !!g).map((g, i) => ({id: -1 - i, mediaId: g.mediaId, url: g.url, altText: null, position: i + 1})),
  };
}
