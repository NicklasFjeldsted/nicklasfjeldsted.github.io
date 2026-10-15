import {Component, ElementRef, HostListener, OnDestroy, inject, signal, viewChild} from '@angular/core';
import {IHasUnsavedChanges} from '../admin.guards';
import {IMedia, IMediaDetail, INotice} from '../admin.models';
import {ConfirmService} from '../shared/confirm-dialog.component';
import {AdminNavService} from '../shell/admin-nav.service';
import {MediaBrowserComponent} from './media-browser.component';
import {MediaDetailComponent} from './media-detail.component';

/** The image library (Billedarkiv): every image uploaded to the website, with upload, search and details. */
@Component({
  selector: 'mvo-media-library',
  imports: [MediaBrowserComponent, MediaDetailComponent],
  template: `
    @if (notice(); as n) {
      <div class="adm-notice" style="margin-top: 0.75rem" [class.adm-notice--error]="n.kind === 'error'" [attr.role]="n.kind === 'error' ? 'alert' : 'status'">
        <span>{{ n.text }}</span>
        <button type="button" class="adm-btn adm-btn--small" (click)="notice.set(null)" aria-label="Luk besked">Luk</button>
      </div>
    }

    <div class="lib-layout">
      <main class="lib-main" aria-label="Billeder">
        <mvo-media-browser mode="manage" [selected]="selectedIds()" (selectedChange)="select($event)" (uploaded)="onUploaded($event)" />
      </main>
      <aside #detail class="lib-detail" aria-label="Valgt billede">
        @if (selectedId(); as id) {
          <mvo-media-detail [mediaId]="id" (saved)="onSaved($event)" (deleted)="onDeleted($event)"
                            (dirtyChange)="dirty.set($event)" (notify)="notice.set($event)" />
        } @else {
          <div class="adm-empty">Vælg et billede for at se, hvor det bruges, og for at ændre navn eller alternativ tekst.</div>
        }
      </aside>
    </div>
  `,
})
export class MediaLibraryComponent implements IHasUnsavedChanges, OnDestroy {
  private readonly confirm = inject(ConfirmService);
  private readonly browser = viewChild.required(MediaBrowserComponent);
  private readonly detailPanel = viewChild.required<ElementRef<HTMLElement>>('detail');

  protected readonly selectedId = signal<number | null>(null);
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly notice = signal<INotice | null>(null);
  protected readonly dirty = signal(false);
  private readonly unregister = inject(AdminNavService).registerDirtyState(() => this.dirty(), () => this.dirty.set(false));

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

  protected async select(ids: number[]): Promise<void> {
    const id = ids[0] ?? null;
    if (id === this.selectedId()) return;
    if (this.dirty() && !(await this.confirmDiscard())) {
      // Keep the highlight on the image whose edits are still open.
      this.selectedIds.set(this.selectedId() === null ? [] : [this.selectedId()!]);
      return;
    }
    this.dirty.set(false);
    this.selectedId.set(id);
    this.selectedIds.set(ids);
    // On narrow screens the details sit below the grid, so bring them into view.
    if (id !== null && window.matchMedia('(max-width: 56rem)').matches) {
      setTimeout(() => this.detailPanel().nativeElement.scrollIntoView({behavior: 'smooth', block: 'start'}));
    }
  }

  protected onUploaded(media: IMedia[]): void {
    this.notice.set({kind: 'success', text: media.length === 1 ? `"${media[0].name}" er uploadet.` : `${media.length} billeder er uploadet.`});
  }

  protected onSaved(detail: IMediaDetail): void {
    this.browser().patchItem(detail.id, {name: detail.name, defaultAltText: detail.defaultAltText, usageCount: detail.usages.length});
  }

  protected onDeleted(id: number): void {
    this.browser().removeItem(id);
    this.dirty.set(false);
    this.selectedId.set(null);
    this.selectedIds.set([]);
  }
}
