import {Component, ElementRef, OnDestroy, computed, inject, signal, viewChildren} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {AdminApiService} from '../admin-api.service';
import {ALLOWED_IMAGE_TYPES, IApiError, IMedia, MAX_IMAGE_BYTES} from '../admin.models';

export interface IUploadDialogData {
  files: File[];
}

type RowState = 'ready' | 'uploading' | 'done' | 'failed';

interface IUploadRow {
  file: File;
  preview: string;
  name: string;
  state: RowState;
  error: string;
  media: IMedia | null;
}

const NAME_MAX = 200;
/** File names from cameras, phones and screenshots say nothing about the picture, so they are not suggested as names. */
const MEANINGLESS_NAME = /^(img|dsc|dscn|dscf|pxl|p|mvimg|photo|image|billede|foto|screenshot|skærmbillede|whatsapp image|signal)?[\s_-]*[\d\s_.:-]+$/i;

/** Turns "facade-norrebro_02.jpg" into "Facade norrebro 02"; returns '' for names like "IMG_4821.jpg". */
export function suggestName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  if (!base || MEANINGLESS_NAME.test(base) || /^[0-9a-f]{16,}$/i.test(base.replace(/-/g, ''))) return '';
  const words = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, NAME_MAX);
}

/**
 * Lets the administrator name new images before they are uploaded to the image library. One row per file;
 * a shared name numbers all images at once, and Enter jumps to the next name. Closes with the uploaded images.
 */
@Component({
  selector: 'mvo-media-upload-dialog',
  imports: [MatDialogModule, FormsModule],
  template: `
    <div class="adm lib-dialog">
      <header class="lib-dialog__head">
        <div>
          <h2>{{ rows().length === 1 ? 'Upload 1 billede' : 'Upload ' + rows().length + ' billeder' }}</h2>
          <p>Giv billederne navne, så de er nemme at finde igen</p>
        </div>
        <button type="button" class="adm-btn adm-btn--small" (click)="close()" [disabled]="uploading()">Luk ✕</button>
      </header>

      <div class="lib-dialog__body">
        @for (e of rejected(); track e) { <p class="adm-error" role="alert">{{ e }}</p> }

        @if (rows().length > 1) {
          <div class="adm-field lib-common">
            <label for="upload-common">Fælles navn <span class="adm-hint">(valgfrit)</span></label>
            <div class="lib-common__row">
              <input id="upload-common" class="adm-input" [ngModel]="common()" (ngModelChange)="common.set($event)" [maxlength]="nameMax - 4"
                     autocomplete="off" placeholder="Fx Skorsten Østerbro" (keydown.enter)="$event.preventDefault(); applyCommon()" [disabled]="uploading()">
              <button type="button" class="adm-btn" (click)="applyCommon()" [disabled]="!common().trim() || uploading()">Brug på alle</button>
            </div>
            <span class="adm-hint">Billederne nummereres automatisk: "{{ common().trim() || 'Navn' }} 1", "{{ common().trim() || 'Navn' }} 2" …</span>
          </div>
        }

        <ul class="lib-upload">
          @for (row of rows(); track row.preview; let i = $index; let last = $last) {
            <li class="lib-upload__row" [class.lib-upload__row--done]="row.state === 'done'">
              <img [src]="row.preview" alt="">
              <div class="adm-field" style="margin: 0">
                <label [for]="'upload-name-' + i">Navn</label>
                <input #nameInput [id]="'upload-name-' + i" class="adm-input" [ngModel]="row.name" (ngModelChange)="setName(i, $event)"
                       [maxlength]="nameMax" autocomplete="off" [placeholder]="row.file.name"
                       [disabled]="row.state === 'uploading' || row.state === 'done'"
                       (keydown.enter)="$event.preventDefault(); next(i, last)">
                <span class="adm-hint">
                  Original fil: {{ row.file.name }} · {{ size(row.file.size) }}
                  @switch (row.state) {
                    @case ('uploading') { · <strong>Uploader…</strong> }
                    @case ('done') { · <strong class="lib-ok">Uploadet ✓</strong> }
                  }
                </span>
                @if (row.error) { <span class="adm-error" role="alert">{{ row.error }}</span> }
              </div>
              <button type="button" class="adm-btn adm-btn--small" (click)="removeRow(i)" [disabled]="row.state === 'uploading' || row.state === 'done'"
                      [attr.aria-label]="'Fjern ' + row.file.name + ' fra upload'">✕</button>
            </li>
          }
        </ul>
        <p class="adm-hint">Tip: Tryk Enter for at hoppe til næste navn. Tomme navne får filens navn, og navnet kan altid ændres senere i billedarkivet.</p>
      </div>

      <footer class="lib-dialog__foot">
        <span class="adm-hint">JPEG, PNG eller WebP, maks. 10 MB pr. billede</span>
        <span class="adm-actions" style="margin: 0">
          <button type="button" class="adm-btn" (click)="close()" [disabled]="uploading()">{{ uploadedCount() ? 'Luk' : 'Annullér' }}</button>
          <button type="button" class="adm-btn adm-btn--primary" (click)="upload()" [disabled]="uploading() || pendingCount() === 0">
            {{ uploading() ? 'Uploader…' : failedCount() ? 'Prøv igen' : pendingCount() === 1 ? 'Upload 1 billede' : 'Upload ' + pendingCount() + ' billeder' }}
          </button>
        </span>
      </footer>
    </div>
  `,
})
export class MediaUploadDialogComponent implements OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly ref = inject<MatDialogRef<MediaUploadDialogComponent, IMedia[]>>(MatDialogRef);
  private readonly data = inject<IUploadDialogData>(MAT_DIALOG_DATA);
  private readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly nameMax = NAME_MAX;
  protected readonly common = signal('');
  protected readonly rejected = signal<string[]>([]);
  protected readonly rows = signal<IUploadRow[]>([]);
  protected readonly uploading = computed(() => this.rows().some(r => r.state === 'uploading'));
  protected readonly pendingCount = computed(() => this.rows().filter(r => r.state === 'ready' || r.state === 'failed').length);
  protected readonly failedCount = computed(() => this.rows().filter(r => r.state === 'failed').length);
  protected readonly uploadedCount = computed(() => this.rows().filter(r => r.state === 'done').length);

  constructor() {
    const allowed = ALLOWED_IMAGE_TYPES.split(',');
    const rejected: string[] = [];
    const rows: IUploadRow[] = [];
    for (const file of this.data.files) {
      if (!allowed.includes(file.type)) rejected.push(`${file.name}: filtypen understøttes ikke (brug JPEG, PNG eller WebP).`);
      else if (file.size > MAX_IMAGE_BYTES) rejected.push(`${file.name}: filen er større end 10 MB.`);
      else rows.push({file, preview: URL.createObjectURL(file), name: suggestName(file.name), state: 'ready', error: '', media: null});
    }
    this.rejected.set(rejected);
    this.rows.set(rows);
    this.ref.disableClose = true;
    this.ref.backdropClick().subscribe(() => this.close());
    this.ref.afterOpened().subscribe(() => this.focus(rows.length > 1 && rows.every(r => !r.name) ? -1 : 0));
  }

  ngOnDestroy(): void {
    this.rows().forEach(r => URL.revokeObjectURL(r.preview));
  }

  protected size(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected setName(index: number, name: string): void {
    this.update(index, {name});
  }

  protected applyCommon(): void {
    const base = this.common().trim();
    if (!base) return;
    let n = 0;
    this.rows.update(rows => rows.map(r => (r.state === 'done' ? r : {...r, name: rows.length === 1 ? base : `${base} ${++n}`})));
  }

  protected next(index: number, last: boolean): void {
    if (last) this.upload();
    else this.focus(index + 1);
  }

  protected removeRow(index: number): void {
    const row = this.rows()[index];
    URL.revokeObjectURL(row.preview);
    this.rows.update(rows => rows.filter((_, i) => i !== index));
    if (this.rows().length === 0) this.close();
  }

  /** Starts (or retries) the upload. Images go up one at a time, so the library lists them in the order they were named. */
  protected upload(): void {
    this.rows.update(rows => rows.map(r => (r.state === 'failed' ? {...r, state: 'ready' as RowState} : r)));
    this.uploadNext();
  }

  private uploadNext(): void {
    const row = this.rows().find(r => r.state === 'ready');
    if (!row) {
      if (this.rows().every(r => r.state === 'done')) this.close();
      return;
    }
    this.updateByPreview(row.preview, {state: 'uploading', error: ''});
    this.api.uploadMedia(row.file, row.name).subscribe({
      next: media => {
        this.updateByPreview(row.preview, {state: 'done', media});
        this.uploadNext();
      },
      error: (e: IApiError) => {
        this.updateByPreview(row.preview, {state: 'failed', error: `Kunne ikke uploades. ${e.fields['Name']?.[0] ?? e.message}`});
        this.uploadNext();
      },
    });
  }

  protected close(): void {
    if (this.uploading()) return;
    this.ref.close(this.rows().filter(r => r.media).map(r => r.media!));
  }

  private update(index: number, patch: Partial<IUploadRow>): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? {...r, ...patch} : r)));
  }

  private updateByPreview(preview: string, patch: Partial<IUploadRow>): void {
    this.rows.update(rows => rows.map(r => (r.preview === preview ? {...r, ...patch} : r)));
  }

  /** -1 focuses the shared name field. */
  private focus(index: number): void {
    setTimeout(() => {
      const el = index < 0 ? document.getElementById('upload-common') as HTMLInputElement | null : this.inputs()[index]?.nativeElement;
      el?.focus();
      el?.select();
    });
  }
}
