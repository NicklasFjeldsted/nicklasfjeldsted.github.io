import {Component, HostListener, OnDestroy, computed, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {AdminApiService} from '../admin-api.service';
import {IHasUnsavedChanges} from '../admin.guards';
import {
  IApiError, INotice, IPageDetail, IPageListItem, ISectionContent, ISectionListItem, SECTION_TYPES,
} from '../admin.models';
import {BeforeAfterEditorComponent} from '../editors/before-after-editor.component';
import {GalleryEditorComponent} from '../editors/gallery-editor.component';
import {PageTextEditorComponent} from '../editors/page-text-editor.component';
import {PrimaryImageEditorComponent} from '../editors/primary-image-editor.component';
import {SectionTextEditorComponent} from '../editors/section-text-editor.component';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {AdminNavService, ContentTab as Tab, contentLinkParams, tabFromParam} from '../shell/admin-nav.service';
const INTRO = 'intro';

@Component({
  selector: 'mvo-admin-content',
  imports: [FormsModule, PageTextEditorComponent, SectionTextEditorComponent, PrimaryImageEditorComponent, GalleryEditorComponent, BeforeAfterEditorComponent],
  templateUrl: './admin-content.component.html',
})
export class AdminContentComponent implements IHasUnsavedChanges, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly nav = inject(AdminNavService);
  private readonly unregister = this.nav.registerDirtyState(() => this.isDirty(), () => this.dirtyFlags.set({}));

  protected readonly sectionTypes = SECTION_TYPES;
  protected readonly pages = signal<IPageListItem[]>([]);
  protected readonly loadingPages = signal(true);
  protected readonly loadError = signal('');
  protected readonly page = signal<IPageDetail | null>(null);
  protected readonly selected = signal<typeof INTRO | number | null>(null);
  protected readonly section = signal<ISectionContent | null>(null);
  protected readonly tab = signal<Tab>('text');
  protected readonly loadingContent = signal(false);
  protected readonly notice = signal<INotice | null>(null);
  protected readonly busy = signal(false);
  protected readonly dirtyFlags = signal<Record<string, boolean>>({});

  protected readonly newTitle = signal('');
  protected readonly newType = signal<number>(SECTION_TYPES[0].id);
  protected readonly adding = signal(false);

  protected readonly isDirty = computed(() => Object.values(this.dirtyFlags()).some(Boolean));
  protected readonly managedPages = computed(() => this.pages().filter(p => p.isManaged));
  protected readonly unmanagedPages = computed(() => this.pages().filter(p => !p.isManaged));
  protected readonly sections = computed(() => [...(this.page()?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
  protected readonly isIntro = computed(() => this.selected() === INTRO);
  protected readonly sectionTitle = computed(() => this.section()?.title ?? '');
  protected readonly tabs = computed(() => {
    const s = this.section();
    const tabs: {id: Tab; label: string}[] = [{id: 'text', label: 'Tekst'}];
    if (s?.sectionType === 'BeforeAfter') {
      tabs.push({id: 'beforeAfter', label: 'Før og efter'});
      return tabs;
    }
    if (s?.hasPrimaryImage) tabs.push({id: 'primary', label: 'Hovedbillede'});
    if (s?.hasGallery) tabs.push({id: 'gallery', label: 'Galleri'});
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
      if (!page || selected === null) return;
      const params = contentLinkParams(page.id, typeof selected === 'number' ? selected : null, tab);
      untracked(() => {
        this.nav.contentParams.set(params);
        if (!this.matches(this.route.snapshot.queryParamMap, params)) {
          void this.router.navigate([], {relativeTo: this.route, queryParams: params, replaceUrl: true});
        }
      });
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
        if (!this.page()) this.openFromParams(this.route.snapshot.queryParamMap);
      },
      error: (e: IApiError) => {
        this.loadingPages.set(false);
        this.loadError.set(e.message);
      },
    });
  }

  protected async selectPage(p: IPageListItem): Promise<void> {
    if (!p.isManaged || this.page()?.id === p.id) return;
    if (!(await this.leave())) return;
    this.openPage(p.id, null, 'text');
  }

  protected async selectIntro(): Promise<void> {
    if (this.selected() === INTRO || !(await this.leave())) return;
    this.section.set(null);
    this.selected.set(INTRO);
  }

  protected async selectSection(s: ISectionListItem): Promise<void> {
    if (this.selected() === s.id || !(await this.leave())) return;
    this.openSection(s.id, 'text');
  }

  protected async selectTab(tab: Tab): Promise<void> {
    if (this.tab() === tab || !(await this.leave())) return;
    this.tab.set(tab);
  }

  protected async reloadSection(): Promise<void> {
    const id = this.selected();
    if (typeof id !== 'number' || !(await this.leave())) return;
    this.openSection(id, this.tab());
  }

  protected onPageChange(page: IPageDetail): void {
    this.page.set(page);
    this.pages.update(list => list.map(p => (p.id === page.id ? {...p, name: page.name} : p)));
  }

  protected onSectionChange(section: ISectionContent): void {
    this.section.set(section);
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
    this.api.createSection(page.id, title, this.newType()).subscribe({
      next: created => {
        this.adding.set(false);
        this.newTitle.set('');
        this.section.set(created);
        this.selected.set(created.id);
        this.tab.set('text');
        this.refreshPage();
        this.notice.set({kind: 'success', text: `Sektionen "${created.title}" er oprettet. Den er skjult, indtil du gør den synlig.`});
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
    } else if (pageId === this.page()?.id && sectionId === null) {
      this.section.set(null);
      this.selected.set(INTRO);
    } else {
      this.openFromParams(params);
    }
  }

  private openPage(pageId: number, sectionId: number | null, tab: Tab): void {
    this.dirtyFlags.set({});
    this.selected.set(null);
    this.section.set(null);
    this.page.set(null);
    this.api.getPage(pageId).subscribe({
      next: detail => {
        this.page.set(detail);
        if (sectionId !== null && detail.sections.some(s => s.id === sectionId)) this.openSection(sectionId, tab);
        else this.selected.set(INTRO);
      },
      error: (e: IApiError) => this.notice.set({kind: 'error', text: `Siden kunne ikke hentes. ${e.message}`}),
    });
  }

  private matches(params: ParamMap, expected: Record<string, unknown>): boolean {
    const keys = ['side', 'sektion', 'fane'];
    return keys.every(k => (params.get(k) ?? '') === (expected[k] === undefined ? '' : String(expected[k])));
  }

  private openSection(id: number, tab: Tab): void {
    const page = this.page();
    if (!page) return;
    this.dirtyFlags.set({});
    this.selected.set(id);
    this.tab.set(tab);
    this.section.set(null);
    this.loadingContent.set(true);
    this.api.getSection(page.id, id).subscribe({
      next: s => {
        this.loadingContent.set(false);
        this.section.set(s);
        this.tab.set(this.tabAllowed(tab, s) ? tab : 'text');
      },
      error: (e: IApiError) => {
        this.loadingContent.set(false);
        this.notice.set({kind: 'error', text: `Sektionen kunne ikke hentes. ${e.message}`});
      },
    });
  }

  private tabAllowed(tab: Tab, s: ISectionContent): boolean {
    const beforeAfter = s.sectionType === 'BeforeAfter';
    if (tab === 'beforeAfter') return beforeAfter;
    if (tab === 'primary') return s.hasPrimaryImage && !beforeAfter;
    if (tab === 'gallery') return s.hasGallery && !beforeAfter;
    return true;
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

  private fail(prefix: string, e: IApiError): void {
    this.busy.set(false);
    this.notice.set({
      kind: 'error',
      text: e.status === 409 ? `${prefix} Indholdet er ændret et andet sted. Genindlæs siden og prøv igen.` : `${prefix} ${e.message}`,
    });
  }
}
