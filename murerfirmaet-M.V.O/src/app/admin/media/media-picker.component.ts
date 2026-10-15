import {Component, Injectable, computed, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {IMediaItem} from '../admin.models';
import {MediaBrowserComponent} from './media-browser.component';

export interface IPickOptions {
  title: string;
  /** Explains where the chosen images end up, e.g. "Facaderestaurering · Billederne tilføjes sidst i galleriet". */
  context: string;
  multiple: boolean;
  confirmLabel: (count: number) => string;
}

/** The image library as a large dialog over the content editor, so choosing images never leaves the editor. */
@Component({
  selector: 'mvo-media-picker',
  imports: [MatDialogModule, MediaBrowserComponent],
  template: `
    <div class="adm lib-dialog lib-dialog--tall">
      <header class="lib-dialog__head">
        <div>
          <h2>{{ data.title }}</h2>
          <p>{{ data.context }}</p>
        </div>
        <button type="button" class="adm-btn adm-btn--small" [mat-dialog-close]="null">Luk ✕</button>
      </header>
      <div class="lib-dialog__body">
        <mvo-media-browser id="picker" mode="pick" [multiple]="data.multiple" [selected]="selected()" (selectedChange)="selected.set($event)"
                           (itemsChange)="remember($event)" />
      </div>
      <footer class="lib-dialog__foot">
        <span>
          <strong>{{ selected().length === 1 ? '1 billede valgt' : selected().length + ' billeder valgt' }}</strong>
          @if (selected().length) { <button type="button" class="adm-btn adm-btn--small" style="margin-left: .5rem" (click)="selected.set([])">Ryd valg</button> }
        </span>
        <span class="adm-actions" style="margin: 0">
          <button type="button" class="adm-btn" [mat-dialog-close]="null">Annullér</button>
          <button type="button" class="adm-btn adm-btn--primary" [disabled]="!chosen().length" (click)="confirm()">{{ data.confirmLabel(chosen().length) }}</button>
        </span>
      </footer>
    </div>
  `,
})
export class MediaPickerComponent {
  protected readonly data = inject<IPickOptions>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<MediaPickerComponent, IMediaItem[] | null>>(MatDialogRef);

  protected readonly selected = signal<number[]>([]);
  private readonly known = signal(new Map<number, IMediaItem>());
  /** The selection in the order it was made, as full items. */
  protected readonly chosen = computed(() => this.selected().map(id => this.known().get(id)).filter((i): i is IMediaItem => !!i));

  protected remember(items: IMediaItem[]): void {
    this.known.update(map => {
      const next = new Map(map);
      items.forEach(i => next.set(i.id, i));
      return next;
    });
  }

  protected confirm(): void {
    this.ref.close(this.chosen());
  }
}

@Injectable({providedIn: 'root'})
export class MediaPickerService {
  private readonly dialog = inject(MatDialog);

  /** Resolves with the chosen images, or an empty list when the dialog is cancelled. */
  async pick(options: IPickOptions): Promise<IMediaItem[]> {
    const ref = this.dialog.open<MediaPickerComponent, IPickOptions, IMediaItem[] | null>(MediaPickerComponent, {
      data: options,
      width: '72rem',
      maxWidth: '94vw',
      height: '88vh',
      autoFocus: 'first-tabbable',
      panelClass: 'adm-dialog-panel',
    });
    return (await firstValueFrom(ref.afterClosed())) ?? [];
  }
}
