import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {AdminApiService} from '../admin-api.service';
import {IApiError, IHomePartSave, INotice, ISectionContent} from '../admin.models';
import {IChosenImage, ImageSourceButtonsComponent} from '../media/image-source-buttons.component';
import {HOME_FALLBACK_IMAGE, HOME_ICONS, HOME_PARTS, homeIcon} from '../../core/interfaces/home-page.interface';

/** The design has room for this many points under the hero heading. Matches HomePage.HeroPointsMax in the backend. */
const MAX_POINTS = 6;

interface ICard {
  icon: string;
  title: string;
  text: string;
}

interface IDraft {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  cards: ICard[];
  image: {mediaId: number; url: string} | null;
}

const PART_HINTS: Record<string, string> = {
  hero: 'Det første besøgende ser. Tilbudsformularen til højre og knapperne "Få et tilbud" og "Ring nu" er faste.',
  trust: 'De fire felter i den mørke stribe lige under toppen. Klik på et ikon for at skifte det.',
  services: 'Overskriften over ydelses-kortene på forsiden.',
  features: 'De fire fordele i den mørke stribe under ydelserne. Klik på et ikon for at skifte det.',
  steps: 'Overskrift og de fire trin. Numrene 1-4 sættes automatisk.',
  projects: 'Overskriften over karrusellen. Billederne er de nyeste projekter fra Projekter.',
};

const CARD_NAMES: Record<string, string> = {trust: 'Felt', features: 'Fordel', steps: 'Trin'};

/**
 * Edits one part of the home page. Which fields show depends on the part: the hero has texts, points and a background
 * image; the card parts have four cards with an icon each; services and projects only their heading.
 */
@Component({
  selector: 'mvo-home-part-editor',
  imports: [FaIconComponent, ImageSourceButtonsComponent, RouterLink],
  template: `
    @let d = draft();
    @let key = section().key;
    <p class="adm-hint adm-home__intro">{{ hint() }}</p>

    @if (hasHeading()) {
      <div class="adm-blocks">
        <section class="adm-block" aria-label="Overtekst">
          <header class="adm-block__head"><span class="adm-block__icon" aria-hidden="true">Aa</span><h3>Overtekst</h3><span class="adm-hint">Lille guldtekst over overskriften. Tom = vises ikke.</span></header>
          <input class="adm-input" maxlength="500" autocomplete="off" [value]="d.eyebrow" (input)="set('eyebrow', $event)" aria-label="Overtekst">
        </section>
        <section class="adm-block" aria-label="Overskrift">
          <header class="adm-block__head"><span class="adm-block__icon" aria-hidden="true">T</span><h3>Overskrift</h3>
            <span class="adm-hint">{{ key === 'hero' ? 'Det sidste ord vises i guld' : key === 'services' ? 'Vises på computer' : '' }}</span></header>
          <input class="adm-input" maxlength="200" autocomplete="off" [value]="d.title" (input)="set('title', $event)" aria-label="Overskrift"
                 [attr.aria-invalid]="showErrors() && !d.title.trim()">
          @if (showErrors() && !d.title.trim()) { <span class="adm-error">Skriv en overskrift.</span> }
        </section>

        @if (key === 'hero') {
          <section class="adm-block" aria-label="Tekst">
            <header class="adm-block__head"><span class="adm-block__icon" aria-hidden="true">≡</span><h3>Tekst</h3><span class="adm-hint">Kort tekst under overskriften</span></header>
            <textarea class="adm-input" maxlength="500" rows="3" [value]="d.description" (input)="set('description', $event)" aria-label="Tekst"
                      [attr.aria-invalid]="showErrors() && !d.description.trim()"></textarea>
            @if (showErrors() && !d.description.trim()) { <span class="adm-error">Skriv en tekst.</span> }
          </section>
          <section class="adm-block" aria-label="Punkter">
            <header class="adm-block__head"><span class="adm-block__icon" aria-hidden="true">•</span><h3>Punkter</h3><span class="adm-hint">Vises med et flueben</span></header>
            <div class="adm-block__points">
              @for (p of d.points; track $index; let i = $index) {
                <div class="adm-block__point">
                  <input class="adm-input" maxlength="100" autocomplete="off" [value]="p" (input)="setPoint(i, $event)" [attr.aria-label]="'Punkt ' + (i + 1)">
                  <button type="button" class="adm-btn adm-btn--small" (click)="removePoint(i)" [attr.aria-label]="'Fjern punkt ' + (i + 1)">Fjern</button>
                </div>
              }
              <div><button type="button" class="adm-btn adm-btn--small" (click)="addPoint()" [disabled]="d.points.length >= maxPoints">+ Tilføj punkt</button></div>
            </div>
          </section>
          <section class="adm-block" aria-label="Baggrundsbillede">
            <header class="adm-block__head"><span class="adm-block__icon" aria-hidden="true">▣</span><h3>Baggrundsbillede</h3><span class="adm-hint">Billedet bag toppen. Vælg et bredt billede.</span></header>
            <img class="adm-preview adm-home__hero-image" [src]="d.image?.url ?? fallbackImage" alt="Baggrundsbillede">
            @if (imagePending()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
            @if (!d.image) { <p class="adm-hint">Standardbilledet vises, indtil du vælger et andet.</p> }
            <div class="adm-actions">
              <mvo-image-source-buttons title="Vælg baggrundsbillede" context="Forside · Toppen · Erstatter billedet, når du gemmer"
                                        [hasImage]="true" [disabled]="busy()" (chosen)="setImage($event)" />
              @if (d.image) { <button type="button" class="adm-btn" (click)="clearImage()" [disabled]="busy()">Brug standardbilledet</button> }
            </div>
          </section>
        }
      </div>
    }

    @if (d.cards.length) {
      <div class="adm-pair adm-home__cards">
        @for (card of d.cards; track $index; let i = $index) {
          <section class="adm-pair__item" [attr.aria-label]="cardName() + ' ' + (i + 1)">
            <h3>{{ cardName() }} {{ i + 1 }}</h3>
            <span class="adm-hint">Ikon</span>
            <div class="adm-icons" role="radiogroup" [attr.aria-label]="'Ikon til ' + cardName().toLowerCase() + ' ' + (i + 1)">
              @for (name of iconNames; track name) {
                <button type="button" class="adm-icons__btn" role="radio" [attr.aria-checked]="card.icon === name" [attr.aria-label]="name"
                        (click)="setCard(i, 'icon', name)"><fa-icon [icon]="icon(name)" /></button>
              }
            </div>
            <div class="adm-field">
              <label [attr.for]="'card-title-' + i">Titel</label>
              <input [id]="'card-title-' + i" class="adm-input" maxlength="100" autocomplete="off" [value]="card.title" (input)="setCard(i, 'title', $event)"
                     [attr.aria-invalid]="showErrors() && !card.title.trim()">
            </div>
            <div class="adm-field">
              <label [attr.for]="'card-text-' + i">Tekst</label>
              <textarea [id]="'card-text-' + i" class="adm-input" maxlength="300" rows="2" [value]="card.text" (input)="setCard(i, 'text', $event)"
                        [attr.aria-invalid]="showErrors() && !card.text.trim()"></textarea>
            </div>
            @if (showErrors() && (!card.title.trim() || !card.text.trim())) { <span class="adm-error">Udfyld titel og tekst.</span> }
          </section>
        }
      </div>
    }

    @if (key === 'services') {
      <div class="adm-notice" role="status">
        <span>Selve ydelserne (billede, titel og tekst på hvert kort) rettes under siden <b>Ydelser</b>, så de er ens på forsiden og på Ydelser-siden.</span>
      </div>
    }
    @if (key === 'projects') {
      <div class="adm-notice" role="status">
        <span>Karrusellen viser billederne fra de nyeste projekter. Klikker man på et billede, kommer man til projektet.</span>
        <a class="adm-btn adm-btn--small" style="white-space: nowrap" routerLink="/admin/projekter">Gå til Projekter →</a>
      </div>
    }

    <div class="adm-savebar">
      <button type="button" class="adm-btn adm-btn--primary" (click)="save()" [disabled]="!dirty() || busy()">{{ busy() ? 'Gemmer…' : 'Gem ændringer' }}</button>
      <button type="button" class="adm-btn" (click)="reset()" [disabled]="!dirty() || busy()">Fortryd</button>
      @if (dirty()) { <span class="adm-badge adm-badge--unsaved">Ugemte ændringer</span> }
    </div>
  `,
})
export class HomePartEditorComponent {
  private readonly api = inject(AdminApiService);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The part as it would look with the unsaved changes, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly maxPoints = MAX_POINTS;
  protected readonly fallbackImage = HOME_FALLBACK_IMAGE;
  protected readonly iconNames = Object.keys(HOME_ICONS);
  protected readonly icon = homeIcon;
  protected readonly busy = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly draft = signal<IDraft>(fromSection(null));

  private readonly saved = computed(() => fromSection(this.section()));
  protected readonly dirty = computed(() => fingerprint(this.draft()) !== fingerprint(this.saved()));
  protected readonly hasHeading = computed(() => ['hero', 'services', 'steps', 'projects'].includes(this.section().key ?? ''));
  protected readonly hint = computed(() => PART_HINTS[this.section().key ?? ''] ?? '');
  protected readonly cardName = computed(() => CARD_NAMES[this.section().key ?? ''] ?? 'Felt');
  protected readonly imagePending = computed(() => this.draft().image?.mediaId !== this.saved().image?.mediaId && !!this.draft().image);

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
    this.showErrors.set(false);
  }

  protected set(field: 'eyebrow' | 'title' | 'description', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update(d => ({...d, [field]: value}));
  }

  protected setPoint(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update(d => ({...d, points: d.points.map((p, i) => (i === index ? value : p))}));
  }

  protected addPoint(): void {
    this.draft.update(d => (d.points.length >= MAX_POINTS ? d : {...d, points: [...d.points, '']}));
  }

  protected removePoint(index: number): void {
    this.draft.update(d => ({...d, points: d.points.filter((_, i) => i !== index)}));
  }

  protected setCard(index: number, field: keyof ICard, value: Event | string): void {
    const text = typeof value === 'string' ? value : (value.target as HTMLInputElement).value;
    this.draft.update(d => ({...d, cards: d.cards.map((c, i) => (i === index ? {...c, [field]: text} : c))}));
  }

  protected setImage(chosen: IChosenImage): void {
    this.draft.update(d => ({...d, image: {mediaId: chosen.mediaId, url: chosen.url}}));
  }

  protected clearImage(): void {
    this.draft.update(d => ({...d, image: null}));
  }

  protected save(): void {
    const s = this.section();
    const d = this.draft();
    const key = s.key ?? '';
    const missing = (this.hasHeading() && !d.title.trim())
      || (key === 'hero' && !d.description.trim())
      || d.cards.some(c => !c.title.trim() || !c.text.trim());
    if (missing) {
      this.showErrors.set(true);
      this.notify.emit({kind: 'error', text: 'Der mangler tekst nogle steder. Udfyld felterne, der er markeret med rødt.'});
      return;
    }

    const body: IHomePartSave = {
      eyebrow: this.hasHeading() ? d.eyebrow.trim() || null : null,
      title: this.hasHeading() ? d.title.trim() : null,
      description: key === 'hero' ? d.description.trim() : null,
      items: key === 'hero'
        ? d.points.map(p => p.trim()).filter(p => p.length > 0).map(text => ({text, description: null, icon: null}))
        : d.cards.map(c => ({text: c.title.trim(), description: c.text.trim(), icon: c.icon})),
      primaryMediaId: key === 'hero' ? d.image?.mediaId ?? null : null,
    };
    this.busy.set(true);
    this.api.saveHomePart(s.pageId, s.id, s.version, body).subscribe({
      next: updated => {
        this.busy.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Ændringerne er gemt og vises nu på forsiden.'});
      },
      error: (error: IApiError) => {
        this.busy.set(false);
        this.notify.emit({
          kind: 'error',
          text: error.status === 409
            ? 'Indholdet er ændret et andet sted, siden du åbnede det. Dine ændringer er ikke gemt. Genindlæs og prøv igen.'
            : `Ændringerne blev ikke gemt. ${error.message}`,
        });
      },
    });
  }
}

/** The label the admin uses for a home page part, such as "Toppen". */
export function homePartLabel(key: string | null): string | null {
  return HOME_PARTS.find(p => p.key === key)?.label ?? null;
}

function fromSection(s: ISectionContent | null): IDraft {
  if (!s) return {eyebrow: '', title: '', description: '', points: [], cards: [], image: null};
  const cards = s.key === 'hero' ? [] : s.items.map(i => ({icon: i.icon ?? 'check', title: i.text, text: i.description ?? ''}));
  return {
    eyebrow: s.eyebrow ?? '',
    title: s.title,
    description: s.description,
    points: s.key === 'hero' ? s.items.map(i => i.text) : [],
    cards,
    image: s.primaryImage ? {mediaId: s.primaryImage.mediaId, url: s.primaryImage.url} : null,
  };
}

/** Compares what would be saved, so typing and deleting the same text does not count as a change. */
function fingerprint(d: IDraft): string {
  return JSON.stringify({...d, image: d.image?.mediaId ?? null});
}

/** The part as the home page would render it with these changes. */
function toSection(s: ISectionContent, d: IDraft): ISectionContent {
  const items = s.key === 'hero'
    ? d.points.filter(p => p.trim()).map(text => ({text, description: null, icon: null}))
    : d.cards.map(c => ({text: c.title, description: c.text, icon: c.icon}));
  return {
    ...s,
    eyebrow: d.eyebrow.trim() || null,
    title: d.title,
    description: d.description,
    items,
    details: items.map(i => i.text),
    primaryImage: d.image ? {mediaId: d.image.mediaId, url: d.image.url, altText: null} : null,
  };
}
