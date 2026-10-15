import {Component, HostListener, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {IHasUnsavedChanges} from '../admin.guards';
import {
  IApiError, INotice, IPageDetail, IPageListItem, ISectionContent, ISectionListItem, SECTION_TYPES,
} from '../admin.models';
import {AuthService} from '../auth.service';
import {BeforeAfterEditorComponent} from '../editors/before-after-editor.component';
import {GalleryEditorComponent} from '../editors/gallery-editor.component';
import {PageTextEditorComponent} from '../editors/page-text-editor.component';
import {PrimaryImageEditorComponent} from '../editors/primary-image-editor.component';
import {SectionTextEditorComponent} from '../editors/section-text-editor.component';
import {ConfirmService} from '../shared/confirm-dialog.component';

type Tab = 'text' | 'primary' | 'gallery' | 'beforeAfter';
const INTRO = 'intro';

@Component({
  selector: 'mvo-admin-content',
  imports: [FormsModule, PageTextEditorComponent, SectionTextEditorComponent, PrimaryImageEditorComponent, GalleryEditorComponent, BeforeAfterEditorComponent],
  templateUrl: './admin-content.component.html',
})
export class AdminContentComponent implements IHasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);

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

  protected logout = async (): Promise<void> => {
    if (this.isDirty() && !(await this.confirmDiscard())) return;
    this.auth.logout();
  };

  protected loadPages(): void {
    this.loadingPages.set(true);
    this.loadError.set('');
    this.api.getPages().subscribe({
      next: pages => {
        this.pages.set(pages);
        this.loadingPages.set(false);
        const first = pages.find(p => p.isManaged);
        if (first && !this.page()) void this.selectPage(first);
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
    this.selected.set(null);
    this.section.set(null);
    this.page.set(null);
    this.api.getPage(p.id).subscribe({
      next: detail => {
        this.page.set(detail);
        this.selected.set(INTRO);
      },
      error: (e: IApiError) => this.notice.set({kind: 'error', text: `Siden kunne ikke hentes. ${e.message}`}),
    });
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

  private openSection(id: number, tab: Tab): void {
    const page = this.page();
    if (!page) return;
    this.dirtyFlags.set({});
    this.selected.set(id);
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
