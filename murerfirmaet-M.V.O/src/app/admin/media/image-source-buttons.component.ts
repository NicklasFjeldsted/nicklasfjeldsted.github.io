import {Component, inject, input, output} from '@angular/core';
import {ALLOWED_IMAGE_TYPES} from '../admin.models';
import {MediaPickerService} from './media-picker.component';
import {MediaUploadService, takeFiles} from './media-upload.service';

/** An image chosen for a single image slot; it already lives in the image library. */
export interface IChosenImage {
  mediaId: number;
  url: string;
  /** The library's default alt text, offered when the slot has none. */
  defaultAltText: string | null;
}

/** "Choose from the library" and "Upload new" for one image. Uploads go through the naming step into the library. */
@Component({
  selector: 'mvo-image-source-buttons',
  template: `
    <button type="button" class="adm-btn" (click)="pick()" [disabled]="disabled()">{{ hasImage() ? 'Vælg andet fra billedarkivet' : 'Vælg fra billedarkivet' }}</button>
    <label class="adm-btn" [class.adm-btn--disabled]="disabled()">
      Upload nyt
      <input type="file" class="adm-visually-hidden" [accept]="accept" (change)="upload($event)" [disabled]="disabled()">
    </label>
  `,
  host: {style: 'display: contents'},
})
export class ImageSourceButtonsComponent {
  private readonly picker = inject(MediaPickerService);
  private readonly uploads = inject(MediaUploadService);

  readonly title = input.required<string>();
  readonly context = input('');
  readonly hasImage = input(false);
  readonly disabled = input(false);
  readonly chosen = output<IChosenImage>();

  protected readonly accept = ALLOWED_IMAGE_TYPES;

  protected async pick(): Promise<void> {
    const [item] = await this.picker.pick({
      title: this.title(),
      context: this.context(),
      multiple: false,
      confirmLabel: () => 'Vælg billede',
    });
    if (item) this.chosen.emit({mediaId: item.id, url: item.url, defaultAltText: item.defaultAltText});
  }

  protected async upload(event: Event): Promise<void> {
    const [media] = await this.uploads.upload(takeFiles(event).slice(0, 1));
    if (media) this.chosen.emit({mediaId: media.id, url: media.url, defaultAltText: null});
  }
}
