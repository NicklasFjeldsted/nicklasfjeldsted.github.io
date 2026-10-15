import {Injectable, inject} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {IMedia} from '../admin.models';
import {IUploadDialogData, MediaUploadDialogComponent} from './media-upload-dialog.component';

/** Opens the "name your images" step and uploads them to the image library. Resolves with the uploaded images. */
@Injectable({providedIn: 'root'})
export class MediaUploadService {
  private readonly dialog = inject(MatDialog);

  async upload(files: File[]): Promise<IMedia[]> {
    if (!files.length) return [];
    const ref = this.dialog.open<MediaUploadDialogComponent, IUploadDialogData, IMedia[]>(MediaUploadDialogComponent, {
      data: {files},
      width: '46rem',
      maxWidth: '94vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'adm-dialog-panel',
    });
    return (await firstValueFrom(ref.afterClosed())) ?? [];
  }
}

/** Reads and clears the files of a file input, so picking the same file twice still fires a change. */
export function takeFiles(event: Event): File[] {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  return files;
}
