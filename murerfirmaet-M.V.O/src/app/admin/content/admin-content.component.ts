import {Component, HostListener, OnDestroy, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {forkJoin, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {AdminApiService} from '../admin-api.service';
import {IHasUnsavedChanges} from '../admin.guards';
import {
  IApiError, INotice, IPageDetail, IPageListItem, ISectionContent, ISectionListItem,
} from '../admin.models';
import {PageTextEditorComponent} from '../editors/page-text-editor.component';
import {PrimaryImageEditorComponent} from '../editors/primary-image-editor.component';
import {SectionBlocksEditorComponent} from '../editors/section-blocks-editor.component';
import {SectionTextEditorComponent} from '../editors/section-text-editor.component';
import {HomePartEditorComponent, homePartLabel} from '../editors/home-part-editor.component';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {IMasonryImage, IMasonrySection, MasonrySectionType} from '../../core/interfaces/masonry-page.interface';
import {MasonryShowcaseComponent} from '../../shared/components/masonry-showcase/masonry-showcase.component';
import {AboutProfileComponent} from '../../shared/components/about-profile/about-profile.component';
import {ABOUT_FALLBACK_IMAGE, IAboutProfile, toParagraphs} from '../../core/interfaces/about-page.interface';
import {AdminNavService, ContentTab as Tab, contentLinkParams, tabFromParam} from '../shell/admin-nav.service';
import {IPagePart, PageMenuComponent} from './page-menu.component';
import {HomePartKey, IHomeContent, toHomeContent} from '../../core/interfaces/home-page.interface';
import {ProjectsService} from '../../core/services/projects.service';
import {HomePartComponent} from '../../shared/components/home-part/home-part.component';
import {projectCarouselItems} from '../../views/home/home.component';
const INTRO = 'intro';
/** The "Ny sektion" form is open in the main area. */
const NEW = 'new';

@Component({
  selector: 'mvo-admin-content',
  imports: [FormsModule, NgTemplateOutlet, PageTextEditorComponent, SectionTextEditorComponent, PrimaryImageEditorComponent, SectionBlocksEditorComponent, HomePartEditorComponent, MasonryShowcaseComponent, AboutProfileComponent, HomePartComponent, PageMenuComponent],
  templateUrl: './admin-content.component.html',
})
export class AdminContentComponent implements IHasUnsavedChanges, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly nav = inject(AdminNavService);
  private readonly unregister = this.nav.registerDirtyState(() => this.isDirty(), () => this.dirtyFlags.set({}));

  protected readonly pages = signal<IPageListItem[]>([]);
  protected readonly loadingPages = signal(true);
  protected readonly loadError = signal('');
  protected readonly page = signal<IPageDetail | null>(null);
  protected readonly selected = signal<typeof INTRO | typeof NEW | number | null>(null);
  /** Sections of every editable page, for the sidebar's flyouts. */
  protected readonly sectionsByPage = signal<Record<number, ISectionListItem[]>>({});
  protected readonly section = signal<ISectionContent | null>(null);
  protected readonly tab = signal<Tab>('text');
  /** A page or section is being fetched; the current one stays on screen until it arrives. */
  protected readonly loadingContent = signal(false);
  /** Only the latest click wins when several loads overlap. */
  private loadRequest = 0;
  protected readonly notice = signal<INotice | null>(null);
  protected readonly busy = signal(false);
  protected readonly dirtyFlags = signal<Record<string, boolean>>({});
  /** The open editor's unsaved version of the section, shown in the preview below it. */
  protected readonly draft = signal<ISectionContent | null>(null);
  protected readonly preview = computed(() => {
    const s = this.draft() ?? this.section();
    return s ? toShowcase(s) : null;
  });
  /** Unsaved page text from the intro editor, shown in the "Om os" preview. */
  protected readonly pageDraft = signal<IPageDetail | null>(null);
  /** The saved profile section of a fixed-layout page, so the intro preview can show the whole layout. */
  protected readonly profileSection = signal<ISectionContent | null>(null);
  protected readonly isFixed = computed(() => this.page()?.hasFixedLayout ?? false);
  protected readonly aboutPreview = computed<IAboutProfile | null>(() => {
    const page = this.pageDraft() ?? this.page();
    if (!page?.hasFixedLayout) return null;
    const open = this.section();
    const profile = open?.sectionType === 'Profile' ? this.draft() ?? open : this.profileSection();
    return toAboutProfile(page, profile);
  });

  /** The open home page part and its content with the unsaved changes, for the preview of the real home page part. */
  protected readonly homePreview = computed<{key: HomePartKey; content: IHomeContent} | null>(() => {
    const s = this.draft() ?? this.section();
    if (s?.sectionType !== 'HomePart' || !s.key) return null;
    const content = toHomeContent([{...s, imageUrl: s.primaryImage?.url ?? null}]);
    return {key: s.key as HomePartKey, content};
  });
  /** The newest projects' images, as the home page's carousel shows them. */
  protected readonly projectImages = toSignal(
    inject(ProjectsService).getProjects().pipe(map(projectCarouselItems), catchError(() => of([]))), {initialValue: []});

  protected readonly newTitle = signal('');
  protected readonly adding = signal(false);

  protected readonly isDirty = computed(() => Object.values(this.dirtyFlags()).some(Boolean));
  protected readonly managedPages = computed(() => this.pages().filter(p => p.isManaged));
  protected readonly sections = computed(() => [...(this.page()?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
  protected readonly isIntro = computed(() => this.selected() === INTRO);
  protected readonly isNew = computed(() => this.selected() === NEW);
  protected readonly sectionIndex = computed(() => this.sections().findIndex(s => s.id === this.selected()));
  protected readonly sectionTitle = computed(() => {
    const s = this.section();
    return s ? homePartLabel(s.key) ?? s.title : '';
  });
  protected readonly isHomePart = computed(() => this.section()?.sectionType === 'HomePart');
  /** The profile on a fixed-layout page keeps its own editors; every other section is built up from parts. */
  protected readonly isProfile = computed(() => this.section()?.sectionType === 'Profile');
  /** Tabs of the profile section on a fixed-layout page; other sections edit everything in one place. */
  protected readonly tabs = computed(() => {
    const s = this.section();
    const tabs: {id: Tab; label: string}[] = [{id: 'text', label: 'Tekst'}];
    if (s?.hasPrimaryImage) tabs.push({id: 'primary', label: 'Billede'});
    return tabs;
  });
  protected readonly tabLabel = computed(() => this.tabs().find(t => t.id === this.tab())?.label ?? '');

  constructor() {
    this.loadPages();

    // The address bar mirrors what is open, so links from the image library and the back button land in the right place.
    effect(() => {
      const page = this.page();
      const selected = this.selected();
      const tab = this.tab();
      if (!page || selected === null || selected === NEW) return;
      const params = contentLinkParams(page.id, typeof selected === 'number' ? selected : null, tab);
      untracked(() => {
        this.nav.contentParams.set(params);
        if (!this.matches(this.route.snapshot.queryParamMap, params)) {
          void this.router.navigate([], {relativeTo: this.route, queryParams: params, replaceUrl: true});
        }
      });
    });

    // The open page's sections are the freshest copy; keep the sidebar in step with them.
    effect(() => {
      const page = this.page();
      if (page) untracked(() => this.sectionsByPage.update(m => ({...m, [page.id]: page.sections})));
    });

    // Back/forward in the browser; the editor's own address updates are ignored.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const page = this.page();
      if (!page || this.loadingPages() || this.router.getCurrentNavigation()?.trigger !== 'popstate') return;
      const selected = this.selected();
      const current = contentLinkParams(page.id, typeof selected === 'number' ? selected : null, this.tab());
      if (!this.matches(params, current)) void this.followLink(params);
    });
  }

  ngOnDestroy(): void {
    this.unregister();
  }

  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }

  confirmDiscard(): Promise<boolean> {
    return this.confirm.discardChanges();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty()) event.preventDefault();
  }

  protected setDirty(key: string, dirty: boolean): void {
    this.dirtyFlags.update(f => (f[key] === dirty ? f : {...f, [key]: dirty}));
  }

  protected loadPages(): void {
    this.loadingPages.set(true);
    this.loadError.set('');
    this.api.getPages().subscribe({
      next: pages => {
        this.pages.set(pages);
        this.loadingPages.set(false);
        this.loadSectionLists();
        if (!this.page()) this.openFromParams(this.route.snapshot.queryParamMap);
      },
      error: (e: IApiError) => {
        this.loadingPages.set(false);
        this.loadError.set(e.message);
      },
    });
  }

  /** A page or section picked in the sidebar. */
  protected async openPart(part: IPagePart): Promise<void> {
    if (part.pageId !== this.page()?.id) {
      if (!(await this.leave())) return;
      this.openPage(part.pageId, part.sectionId, 'text');
    } else if (part.sectionId === null) {
      await this.selectIntro();
    } else if (this.selected() !== part.sectionId && (await this.leave())) {
      this.openSection(part.sectionId, 'text');
    }
  }

  protected async startNewSection(pageId: number): Promise<void> {
    if (this.selected() === NEW && this.page()?.id === pageId) return;
    if (!(await this.leave())) return;
    if (pageId !== this.page()?.id) {
      this.openPage(pageId, null, 'text', true);
      return;
    }
    this.section.set(null);
    this.draft.set(null);
    this.selected.set(NEW);
  }

  protected async selectIntro(): Promise<void> {
    if (this.selected() === INTRO || !(await this.leave())) return;
    this.loadRequest++;
    this.loadingContent.set(false);
    this.section.set(null);
    this.draft.set(null);
    this.selected.set(INTRO);
  }

  protected async selectSection(s: ISectionListItem): Promise<void> {
    if (this.selected() === s.id || !(await this.leave())) return;
    this.openSection(s.id, 'text');
  }

  protected async selectTab(tab: Tab): Promise<void> {
    if (this.tab() === tab || !(await this.leave())) return;
    this.draft.set(null);
    this.tab.set(tab);
  }

  protected async reloadSection(): Promise<void> {
    const id = this.selected();
    if (typeof id !== 'number' || !(await this.leave())) return;
    this.openSection(id, this.tab());
  }

  protected onPageChange(page: IPageDetail): void {
    this.pageDraft.set(null);
    this.page.set(page);
    this.pages.update(list => list.map(p => (p.id === page.id ? {...p, name: page.name} : p)));
  }

  protected onSectionChange(section: ISectionContent): void {
    this.draft.set(null);
    this.section.set(section);
    if (section.sectionType === 'Profile') this.profileSection.set(section);
    this.refreshPage();
  }

  protected async move(index: number, delta: number): Promise<void> {
    const page = this.page();
    if (!page || this.busy()) return;
    const ids = this.sections().map(s => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.busy.set(true);
    this.api.reorderSections(page.id, page.version, ids).subscribe({
      next: updated => {
        this.busy.set(false);
        this.page.set(updated);
        this.notice.set({kind: 'success', text: 'Sektionernes rækkefølge er gemt.'});
      },
      error: (e: IApiError) => this.fail('Rækkefølgen blev ikke gemt.', e),
    });
  }

  protected toggleVisibility(): void {
    const s = this.section();
    if (!s || this.busy()) return;
    this.busy.set(true);
    this.api.setVisibility(s.pageId, s.id, s.version, !s.isPublished).subscribe({
      next: updated => {
        this.busy.set(false);
        this.onSectionChange(updated);
        this.notice.set({kind: 'success', text: updated.isPublished ? 'Sektionen er nu synlig på siden.' : 'Sektionen er nu skjult på siden.'});
      },
      error: (e: IApiError) => this.fail('Synligheden blev ikke ændret.', e),
    });
  }

  protected async deleteSection(): Promise<void> {
    const s = this.section();
    if (!s || this.busy()) return;
    const ok = await this.confirm.ask({
      title: 'Slet sektionen?',
      message: `Sektionen "${s.title}" og dens billedplaceringer slettes permanent. Selve billedfilerne slettes ikke.`,
      confirmLabel: 'Slet sektion',
      destructive: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.api.deleteSection(s.pageId, s.id, s.version).subscribe({
      next: () => {
        this.busy.set(false);
        this.dirtyFlags.set({});
        this.section.set(null);
        this.selected.set(INTRO);
        this.refreshPage();
        this.notice.set({kind: 'success', text: `Sektionen "${s.title}" er slettet.`});
      },
      error: (e: IApiError) => this.fail('Sektionen blev ikke slettet.', e),
    });
  }

  protected async addSection(): Promise<void> {
    const page = this.page();
    const title = this.newTitle().trim();
    if (!page || !title || this.adding()) return;
    if (!(await this.leave())) return;
    this.adding.set(true);
    this.api.createSection(page.id, title).subscribe({
      next: created => {
        this.adding.set(false);
        this.newTitle.set('');
        this.section.set(created);
        this.selected.set(created.id);
        this.tab.set('text');
        this.refreshPage();
        this.notice.set({kind: 'success', text: `Sektionen "${created.title}" er oprettet. Tilføj tekst og billeder herunder. Den er skjult, indtil du gør den synlig.`});
      },
      error: (e: IApiError) => {
        this.adding.set(false);
        this.notice.set({kind: 'error', text: `Sektionen blev ikke oprettet. ${e.fields['Title']?.[0] ?? e.message}`});
      },
    });
  }

  /** Opens the page, section and tab named in the address bar, or the first editable page. */
  private openFromParams(params: ParamMap): void {
    const pageId = Number(params.get('side'));
    const requested = this.managedPages().find(p => p.id === pageId);
    const target = requested ?? this.managedPages()[0];
    if (!target) return;
    const sectionId = requested ? Number(params.get('sektion')) || null : null;
    this.openPage(target.id, sectionId, tabFromParam(params.get('fane')));
  }

  /** Follows a back/forward navigation that changed the address while the editor is open. */
  private async followLink(params: ParamMap): Promise<void> {
    if (!(await this.leave())) {
      const page = this.page()!;
      const selected = this.selected();
      void this.router.navigate([], {relativeTo: this.route, replaceUrl: true,
        queryParams: contentLinkParams(page.id, typeof selected === 'number' ? selected : null, this.tab())});
      return;
    }
    const pageId = Number(params.get('side'));
    const sectionId = Number(params.get('sektion')) || null;
    if (pageId === this.page()?.id && sectionId !== null && this.sections().some(s => s.id === sectionId)) {
      this.openSection(sectionId, tabFromParam(params.get('fane')));
    } else if (pageId === this.page()?.id && sectionId === null && this.hasIntro(pageId)) {
      this.section.set(null);
      this.selected.set(INTRO);
    } else {
      this.openFromParams(params);
    }
  }

  /**
   * Loads the page (and the section to show) before anything on screen changes, then swaps it all at once, so moving
   * between pages feels like one screen instead of a reload.
   */
  private openPage(pageId: number, sectionId: number | null, tab: Tab, startNew = false): void {
    const request = ++this.loadRequest;
    this.loadingContent.set(true);
    this.api.getPage(pageId).pipe(
      switchMap(detail => {
        const profile = detail.hasFixedLayout ? detail.sections.find(s => s.sectionType === 'Profile') : undefined;
        const requested = sectionId !== null && detail.sections.some(s => s.id === sectionId) ? sectionId : null;
        // The home page has no intro text, so it opens on its first part.
        const target = requested ?? (this.hasIntro(detail.id) ? null : detail.sections[0]?.id ?? null);
        return forkJoin({
          detail: of(detail),
          profile: profile ? this.api.getSection(detail.id, profile.id) : of(null),
          section: target === null ? of(null) : target === profile?.id ? of(null) : this.api.getSection(detail.id, target),
          target: of(target),
        });
      }),
    ).subscribe({
      next: ({detail, profile, section, target}) => {
        if (request !== this.loadRequest) return;
        this.loadingContent.set(false);
        this.dirtyFlags.set({});
        this.draft.set(null);
        this.pageDraft.set(null);
        this.page.set(detail);
        this.profileSection.set(profile);
        const shown = target === null ? null : section ?? profile;
        this.section.set(shown);
        if (shown) {
          this.tab.set(this.tabAllowed(tab, shown) ? tab : 'text');
          this.selected.set(shown.id);
        } else {
          this.tab.set('text');
          this.selected.set(startNew && !detail.hasFixedLayout ? NEW : INTRO);
        }
      },
      error: (e: IApiError) => {
        if (request !== this.loadRequest) return;
        this.loadingContent.set(false);
        this.notice.set({kind: 'error', text: `Siden kunne ikke hentes. ${e.message}`});
      },
    });
  }


  private hasIntro(pageId: number): boolean {
    return this.pages().find(p => p.id === pageId)?.hasIntro ?? true;
  }

  private matches(params: ParamMap, expected: Record<string, unknown>): boolean {
    const keys = ['side', 'sektion', 'fane'];
    return keys.every(k => (params.get(k) ?? '') === (expected[k] === undefined ? '' : String(expected[k])));
  }

  /** Fetches the section first and only then swaps the editor over, so the old one stays on screen meanwhile. */
  private openSection(id: number, tab: Tab): void {
    const page = this.page();
    if (!page) return;
    const request = ++this.loadRequest;
    this.loadingContent.set(true);
    this.api.getSection(page.id, id).subscribe({
      next: s => {
        if (request !== this.loadRequest) return;
        this.loadingContent.set(false);
        this.dirtyFlags.set({});
        this.draft.set(null);
        this.section.set(s);
        this.tab.set(this.tabAllowed(tab, s) ? tab : 'text');
        this.selected.set(id);
      },
      error: (e: IApiError) => {
        if (request !== this.loadRequest) return;
        this.loadingContent.set(false);
        this.notice.set({kind: 'error', text: `Sektionen kunne ikke hentes. ${e.message}`});
      },
    });
  }


  private tabAllowed(tab: Tab, s: ISectionContent): boolean {
    return tab === 'text' || (tab === 'primary' && s.sectionType === 'Profile' && s.hasPrimaryImage);
  }

  private async leave(): Promise<boolean> {
    if (!this.isDirty()) return true;
    if (!(await this.confirmDiscard())) return false;
    this.dirtyFlags.set({});
    return true;
  }

  private refreshPage(): void {
    const page = this.page();
    if (!page) return;
    this.api.getPage(page.id).subscribe({
      next: detail => this.page.update(current => (current && !this.dirtyFlags()['page'] ? detail : current)),
    });
    this.api.getPages().subscribe({next: pages => this.pages.set(pages)});
  }

  private loadSectionLists(): void {
    const pages = this.managedPages();
    if (!pages.length) return;
    forkJoin(pages.map(p => this.api.getPage(p.id))).subscribe({
      next: details => this.sectionsByPage.update(m => ({...m, ...Object.fromEntries(details.map(d => [d.id, d.sections]))})),
    });
  }

  private fail(prefix: string, e: IApiError): void {
    this.busy.set(false);
    this.notice.set({
      kind: 'error',
      text: e.status === 409 ? `${prefix} Indholdet er ændret et andet sted. Genindlæs siden og prøv igen.` : `${prefix} ${e.message}`,
    });
  }
}

/** Maps the page text and profile section to what the public "Om os" page renders. */
function toAboutProfile(page: IPageDetail, profile: ISectionContent | null): IAboutProfile {
  return {
    eyebrow: page.eyebrow ?? undefined,
    heading: page.heading,
    introduction: page.introduction,
    name: profile?.title ?? '',
    role: profile?.eyebrow ?? undefined,
    story: toParagraphs(profile?.description ?? ''),
    imageUrl: profile?.primaryImage?.url ?? ABOUT_FALLBACK_IMAGE,
  };
}

/** Maps the admin's section to the shape the public page renders, so the preview uses the real component. */
function toShowcase(s: ISectionContent): IMasonrySection {
  const image = (key: string, url: string, alt: string | null): IMasonryImage => ({id: key, url, alt: alt ?? ''});
  return {
    id: `preview-${s.id}`,
    type: s.sectionType as MasonrySectionType,
    title: s.title,
    eyebrow: s.eyebrow ?? undefined,
    introduction: s.introduction ?? undefined,
    description: s.description,
    additionalDescription: s.additionalDescription ?? undefined,
    details: s.details,
    primaryImage: s.primaryImage ? image('primary', s.primaryImage.url, s.primaryImage.altText) : undefined,
    gallery: [...s.gallery].sort((a, b) => a.position - b.position).map((g, i) => image(`g${i}-${g.mediaId}`, g.url, g.altText)),
    displayOrder: s.displayOrder,
    published: s.isPublished,
  };
}
