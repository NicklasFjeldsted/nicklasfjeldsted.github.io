import {Injectable, inject, signal} from '@angular/core';
import {Params} from '@angular/router';
import {ConfirmService} from '../shared/confirm-dialog.component';

export type ContentTab = 'text' | 'primary' | 'gallery' | 'beforeAfter';

/** Tab ids as they appear in the address bar, e.g. /admin?side=2&sektion=5&fane=galleri. */
const TAB_PARAM: Record<ContentTab, string> = {text: 'tekst', primary: 'hovedbillede', gallery: 'galleri', beforeAfter: 'foer-efter'};

export function contentLinkParams(pageId: number, sectionId: number | null, tab: ContentTab = 'text'): Params {
  return sectionId === null ? {side: pageId} : {side: pageId, sektion: sectionId, fane: TAB_PARAM[tab]};
}

export function tabFromParam(value: string | null): ContentTab {
  return (Object.entries(TAB_PARAM).find(([, v]) => v === value)?.[0] as ContentTab | undefined) ?? 'text';
}

/**
 * Shared state for the admin shell: where the content editor was left (so the "Website-indhold" tab returns there)
 * and whether the open screen has unsaved changes (so logging out can warn first).
 */
@Injectable({providedIn: 'root'})
export class AdminNavService {
  private readonly confirm = inject(ConfirmService);
  private dirty: {check: () => boolean; discard: () => void} | null = null;

  readonly contentParams = signal<Params>({});

  /** The active screen registers how to check and throw away its unsaved changes. Returns an unregister function. */
  registerDirtyState(check: () => boolean, discard: () => void): () => void {
    const entry = {check, discard};
    this.dirty = entry;
    return () => {
      if (this.dirty === entry) this.dirty = null;
    };
  }

  /** Asks before unsaved changes are thrown away. Once confirmed, the route guard will not ask again. */
  async confirmLeave(): Promise<boolean> {
    if (!this.dirty?.check()) return true;
    if (!(await this.confirm.discardChanges())) return false;
    this.dirty?.discard();
    return true;
  }
}
