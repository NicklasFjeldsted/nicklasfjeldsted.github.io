import {Component, HostListener, OnDestroy, input, output, signal} from '@angular/core';
import {IPageListItem, ISectionListItem} from '../admin.models';

export interface IPagePart {
  pageId: number;
  /** null is the page's own intro text ("Sideindledning"). */
  sectionId: number | null;
}

/** How long the flyout stays open after the pointer leaves, so a slightly crooked path to it does not close it. */
const CLOSE_DELAY_MS = 200;

/**
 * Sidebar listing the editable pages. The open page lists its parts (intro, sections, "+ Ny sektion") right under it.
 * Hovering (or focusing) another page shows its parts in a flyout, like a webshop's category menu; on touch screens a tap
 * opens the page instead.
 */
@Component({
  selector: 'mvo-admin-page-menu',
  template: `
    <nav class="adm-pages" aria-label="Sider">
      <h2>Sider</h2>
      <ul class="adm-pages__list">
        @for (p of pages(); track p.id) {
          @let parts = sectionsByPage()[p.id] ?? [];
          @let current = currentPageId() === p.id;
          <li class="adm-pages__item" [class.adm-pages__item--current]="current" [class.adm-pages__item--open]="!current && openId() === p.id"
              (mouseenter)="hoverOpen(p.id)" (mouseleave)="hoverClose(p.id)" (focusin)="hoverOpen(p.id)" (focusout)="onFocusOut($event, p.id)">
            <button type="button" class="adm-pages__btn" [attr.aria-current]="current ? 'page' : null"
                    [attr.aria-expanded]="current || openId() === p.id" [attr.aria-controls]="'parts-' + p.id" (click)="selectPage(p.id, current)">
              <span class="adm-pages__name">{{ p.name }}</span>
              <span class="adm-pages__meta">{{ parts.length + 1 }} dele</span>
              <span class="adm-pages__chev" aria-hidden="true">›</span>
            </button>
            <div class="adm-flyout" [id]="'parts-' + p.id">
              <div class="adm-flyout__panel">
              <p class="adm-flyout__title">{{ p.name }}</p>
              <ul class="adm-flyout__list">
                <li>
                  <button type="button" class="adm-flyout__btn" [attr.aria-current]="current && selected() === 'intro' ? 'true' : null" (click)="pick(p.id, null)">
                    <span>Sideindledning</span><span class="adm-hint">Overskrift og tekst øverst</span>
                  </button>
                </li>
                @for (s of parts; track s.id) {
                  <li>
                    <button type="button" class="adm-flyout__btn" [attr.aria-current]="current && selected() === s.id ? 'true' : null" (click)="pick(p.id, s.id)">
                      <span>{{ s.title }}</span>
                      @if (!s.isPublished) { <span class="adm-badge adm-badge--hidden">Skjult</span> }
                    </button>
                  </li>
                }
              </ul>
              @if (!p.hasFixedLayout) {
                <button type="button" class="adm-flyout__add" (click)="add(p.id)">+ Ny sektion</button>
              } @else {
                <p class="adm-hint adm-flyout__note">Fast design: tekster og billede kan ændres.</p>
              }
              </div>
            </div>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class PageMenuComponent implements OnDestroy {
  readonly pages = input.required<IPageListItem[]>();
  readonly sectionsByPage = input.required<Record<number, ISectionListItem[]>>();
  readonly currentPageId = input<number | null>(null);
  readonly selected = input<'intro' | 'new' | number | null>(null);
  readonly openPart = output<IPagePart>();
  readonly addSection = output<number>();

  protected readonly openId = signal<number | null>(null);
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  /** Touch screens fire hover and focus on a tap too; there only the tap itself opens and closes a page. */
  private readonly canHover = window.matchMedia('(hover: hover)').matches;

  ngOnDestroy(): void {
    clearTimeout(this.closeTimer);
  }

  @HostListener('document:keydown.escape')
  protected closeNow(): void {
    clearTimeout(this.closeTimer);
    this.openId.set(null);
  }

  protected hoverOpen(id: number): void {
    if (!this.canHover) return;
    clearTimeout(this.closeTimer);
    this.openId.set(id);
  }

  protected hoverClose(id: number): void {
    if (!this.canHover) return;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.openId.update(open => (open === id ? null : open)), CLOSE_DELAY_MS);
  }

  /** Clicking a page opens it; its parts then stay listed under it in the sidebar. */
  protected selectPage(id: number, current: boolean): void {
    if (current) return;
    this.pick(id, null);
  }

  protected onFocusOut(event: FocusEvent, id: number): void {
    const item = event.currentTarget as HTMLElement;
    if (!item.contains(event.relatedTarget as Node | null)) this.hoverClose(id);
  }

  protected pick(pageId: number, sectionId: number | null): void {
    this.closeNow();
    this.openPart.emit({pageId, sectionId});
  }

  protected add(pageId: number): void {
    this.closeNow();
    this.addSection.emit(pageId);
  }
}
