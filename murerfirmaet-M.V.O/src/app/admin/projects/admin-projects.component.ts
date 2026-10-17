import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, ElementRef, HostListener, OnDestroy, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {QUOTE_CATEGORIES, QuoteCategory} from '../../core/constants/quote-categories.constants';
import {IProject} from '../../core/interfaces/project.interface';
import {ProjectSectionComponent} from '../../shared/components/project-section/project-section.component';
import {AdminApiService} from '../admin-api.service';
import {IHasUnsavedChanges} from '../admin.guards';
import {
  ALLOWED_IMAGE_TYPES, IApiError, INotice, IProjectDetail, IProjectImage, IProjectInput, IProjectListItem, MAX_FEATURED_PROJECTS,
} from '../admin.models';
import {MediaPickerService} from '../media/media-picker.component';
import {MediaUploadService, takeFiles} from '../media/media-upload.service';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {AdminNavService} from '../shell/admin-nav.service';

/** The editor's working copy: the input that is saved, plus the images as shown. */
interface IDraft {
  title: string;
  category: QuoteCategory;
  location: string;
  /** yyyy-mm, as the month field gives it. */
  completedMonth: string;
  summary: string;
  description: string;
  isFeatured: boolean;
  isPublished: boolean;
  images: IProjectImage[];
}

/** Labels match the public site (quote.categories in da.json). */
const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  bathroom: 'Badeværelse',
  tiles: 'Fliser og klinker',
  masonry: 'Murerarbejde',
  plaster: 'Puds og facade',
  renovation: 'Renovering',
  repair: 'Reparationer og småopgaver',
  other: 'Andet',
};

const NEW = 'ny';

/** Projects on the Projekter page: create, edit and delete them. Everything in the editor is saved with one "Gem ændringer". */
@Component({
  selector: 'mvo-admin-projects',
  imports: [FormsModule, CdkDropList, CdkDrag, ProjectSectionComponent],
  templateUrl: './admin-projects.component.html',
})
export class AdminProjectsComponent implements IHasUnsavedChanges, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly picker = inject(MediaPickerService);
  private readonly uploads = inject(MediaUploadService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly unregister = inject(AdminNavService).registerDirtyState(() => this.dirty(), () => this.reset());

  protected readonly categories = QUOTE_CATEGORIES.map(id => ({id, label: CATEGORY_LABELS[id]}));
  protected readonly maxFeatured = MAX_FEATURED_PROJECTS;
  protected readonly accept = ALLOWED_IMAGE_TYPES;

  protected readonly projects = signal<IProjectListItem[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly listError = signal('');
  /** The open project: its id, NEW for one not saved yet, or null when nothing is open. */
  protected readonly selected = signal<number | typeof NEW | null>(null);
  protected readonly saved = signal<IProjectDetail | null>(null);
  protected readonly loadingProject = signal(false);
  protected readonly draft = signal<IDraft | null>(null);
  private readonly original = signal<IDraft | null>(null);
  protected readonly busy = signal(false);
  protected readonly notice = signal<INotice | null>(null);
  protected readonly errors = signal<Record<string, string[]>>({});
  protected readonly menuOpen = signal(false);
  protected readonly announcement = signal('');

  protected readonly isNew = computed(() => this.selected() === NEW);
  protected readonly dirty = computed(() => {
    const d = this.draft();
    return !!d && JSON.stringify(d) !== JSON.stringify(this.original());
  });
  /** Featured places taken by other projects than the open one. */
  protected readonly featuredElsewhere = computed(() =>
    this.projects().filter(p => p.isFeatured && p.id !== this.selected()).length);
  protected readonly featuredFull = computed(() => this.featuredElsewhere() >= MAX_FEATURED_PROJECTS);

  /** The open project as the public page would show it, with unsaved changes. */
  protected readonly preview = computed<IProject | null>(() => {
    const d = this.draft();
    if (!d) return null;
    return {
      id: 'preview',
      slug: this.saved()?.slug ?? 'nyt-projekt',
      title: d.title.trim() || 'Projektets titel',
      category: d.category,
      location: d.location.trim() || 'Sted',
      completedOn: `${d.completedMonth || thisMonth()}-01`,
      summary: d.summary.trim() || 'Den korte tekst om projektet vises her.',
      description: [],
      images: d.images.map(i => ({id: String(i.mediaId), url: i.url, alt: ''})),
      featured: d.isFeatured,
    };
  });
  /** Where the open project sits among the three at the top of the page, if it is there. */
  protected readonly previewIndex = computed(() => {
    const top = [...this.projects().filter(p => p.isFeatured), ...this.projects().filter(p => !p.isFeatured)].slice(0, 3);
    const index = top.findIndex(p => p.id === this.selected());
    return index < 0 ? 0 : index;
  });

  constructor() {
    this.loadList();
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.open(params.get('projekt')));
  }

  ngOnDestroy(): void {
    this.unregister();
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  confirmDiscard(): Promise<boolean> {
    return this.confirm.discardChanges();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  @HostListener('document:click', ['$event'])
  protected closeMenuOutside(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.querySelector('.adm-menu')?.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async select(id: number | typeof NEW): Promise<void> {
    if (id === this.selected()) return;
    if (this.dirty() && !(await this.confirmDiscard())) return;
    this.reset();
    this.notice.set(null);
    await this.router.navigate([], {queryParams: {projekt: id}});
  }

  protected loadList(): void {
    this.loadingList.set(true);
    this.api.getProjects().subscribe({
      next: list => {
        this.projects.set(list);
        this.loadingList.set(false);
        this.listError.set('');
      },
      error: (e: IApiError) => {
        this.loadingList.set(false);
        this.listError.set(e.message);
      },
    });
  }

  protected update<K extends keyof IDraft>(key: K, value: IDraft[K]): void {
    this.draft.update(d => (d ? {...d, [key]: value} : d));
  }

  protected reset(): void {
    this.draft.set(this.original());
    this.errors.set({});
  }

  protected fieldErrors(name: string): string[] {
    const wanted = name.toLowerCase();
    return Object.entries(this.errors())
      .filter(([key]) => key.toLowerCase().replace(/^project\./, '') === wanted)
      .flatMap(([, messages]) => messages);
  }

  protected categoryLabel(id: string): string {
    return CATEGORY_LABELS[id as QuoteCategory] ?? id;
  }

  protected monthLabel(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('da-DK', {month: 'long', year: 'numeric'});
  }

  // Images

  protected async addFromLibrary(): Promise<void> {
    this.menuOpen.set(false);
    const items = await this.picker.pick({
      title: 'Vælg billeder til projektet',
      context: `${this.draft()?.title || 'Nyt projekt'} · Billederne tilføjes sidst`,
      multiple: true,
      confirmLabel: n => (n === 1 ? 'Tilføj 1 billede' : `Tilføj ${n} billeder`),
    });
    this.append(items.map(i => ({mediaId: i.id, url: i.url, name: i.name})));
  }

  protected async addFromDevice(event: Event): Promise<void> {
    this.menuOpen.set(false);
    const media = await this.uploads.upload(takeFiles(event));
    this.append(media.map(m => ({mediaId: m.id, url: m.url, name: m.name})));
  }

  protected drop(event: CdkDragDrop<IProjectImage[]>): void {
    this.moveImage(event.previousIndex, event.currentIndex);
  }

  protected moveImage(from: number, to: number): void {
    const images = [...(this.draft()?.images ?? [])];
    if (to < 0 || to >= images.length || from === to) return;
    moveItemInArray(images, from, to);
    this.update('images', images);
    this.announcement.set(`Billede flyttet fra plads ${from + 1} til plads ${to + 1}. Husk at gemme.`);
  }

  protected removeImage(index: number): void {
    this.update('images', (this.draft()?.images ?? []).filter((_, i) => i !== index));
    this.announcement.set(`Billede ${index + 1} er fjernet. Husk at gemme.`);
  }

  private append(images: IProjectImage[]): void {
    const current = this.draft()?.images ?? [];
    const fresh = images.filter(i => !current.some(c => c.mediaId === i.mediaId));
    if (fresh.length) {
      this.update('images', [...current, ...fresh]);
      this.announcement.set(`${fresh.length} billede(r) tilføjet. Husk at gemme.`);
    }
  }

  // Saving

  protected save(): void {
    const d = this.draft();
    if (!d || this.busy()) return;
    const input: IProjectInput = {
      title: d.title, category: d.category, location: d.location, completedOn: `${d.completedMonth}-01`,
      summary: d.summary, description: d.description, isFeatured: d.isFeatured, isPublished: d.isPublished,
      mediaIds: d.images.map(i => i.mediaId),
    };
    const current = this.saved();
    const request = current ? this.api.updateProject(current.id, current.version, input) : this.api.createProject(input);
    this.busy.set(true);
    this.errors.set({});
    request.subscribe({
      next: project => {
        this.busy.set(false);
        this.show(project);
        this.loadList();
        this.notice.set({kind: 'success', text: current ? 'Projektet er gemt.' : 'Projektet er oprettet.'});
        if (!current) this.router.navigate([], {queryParams: {projekt: project.id}, replaceUrl: true});
      },
      error: (e: IApiError) => {
        this.busy.set(false);
        this.errors.set(e.fields);
        this.notice.set({kind: 'error', text: `Projektet blev ikke gemt. ${e.status === 400 ? 'Ret felterne markeret herunder.' : e.message}`});
      },
    });
  }

  protected async remove(): Promise<void> {
    const p = this.saved();
    if (!p) return;
    const ok = await this.confirm.ask({
      title: 'Slet projektet?',
      message: `"${p.title}" fjernes fra hjemmesiden og kan ikke gendannes. Billederne bliver i billedarkivet.`,
      confirmLabel: 'Slet projekt',
      destructive: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.api.deleteProject(p.id, p.version).subscribe({
      next: () => {
        this.busy.set(false);
        this.original.set(null);
        this.draft.set(null);
        this.loadList();
        this.notice.set({kind: 'success', text: `"${p.title}" er slettet.`});
        this.router.navigate([], {queryParams: {}});
      },
      error: (e: IApiError) => {
        this.busy.set(false);
        this.notice.set({kind: 'error', text: `Projektet blev ikke slettet. ${e.message}`});
      },
    });
  }

  private open(param: string | null): void {
    const id = param === NEW ? NEW : param && Number(param) > 0 ? Number(param) : null;
    // After "Opret" the address changes to the new id; the editor already shows it.
    if (id !== null && id !== NEW && this.saved()?.id === id) {
      this.selected.set(id);
      return;
    }
    this.selected.set(id);
    this.saved.set(null);
    this.errors.set({});
    if (id === null) {
      this.setDraft(null);
    } else if (id === NEW) {
      this.setDraft({
        title: '', category: 'bathroom', location: '', completedMonth: thisMonth(), summary: '', description: '',
        isFeatured: false, isPublished: true, images: [],
      });
    } else {
      this.loadingProject.set(true);
      this.api.getProject(id).subscribe({
        next: project => {
          this.loadingProject.set(false);
          this.show(project);
        },
        error: (e: IApiError) => {
          this.loadingProject.set(false);
          this.setDraft(null);
          this.notice.set({kind: 'error', text: `Projektet kunne ikke hentes. ${e.message}`});
        },
      });
    }
  }

  private show(project: IProjectDetail): void {
    this.saved.set(project);
    this.setDraft({
      title: project.title,
      category: project.category as QuoteCategory,
      location: project.location,
      completedMonth: project.completedOn.slice(0, 7),
      summary: project.summary,
      description: project.description,
      isFeatured: project.isFeatured,
      isPublished: project.isPublished,
      images: project.images,
    });
  }

  private setDraft(draft: IDraft | null): void {
    this.original.set(draft);
    this.draft.set(draft);
  }
}

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
