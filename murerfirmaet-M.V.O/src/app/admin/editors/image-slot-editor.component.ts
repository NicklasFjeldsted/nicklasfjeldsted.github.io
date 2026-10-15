import {Component, input, output} from '@angular/core';
import {IChosenImage, ImageSourceButtonsComponent} from '../media/image-source-buttons.component';

/** One image with its label and the buttons to choose another. Presentational: the parent keeps and saves the choice. */
@Component({
  selector: 'mvo-image-slot-editor',
  imports: [ImageSourceButtonsComponent],
  template: `
    <h3>{{ label() }}</h3>
    <p class="adm-hint">{{ hint() }}</p>

    @if (url(); as src) {
      <img class="adm-preview" [src]="src" [alt]="label()">
      @if (pending()) { <span class="adm-badge adm-badge--unsaved">Nyt billede – ikke gemt endnu</span> }
    } @else {
      <div class="adm-empty">Der er endnu intet billede.</div>
    }

    <div class="adm-actions">
      <mvo-image-source-buttons [title]="'Vælg ' + label().toLowerCase()" [context]="hint()" [hasImage]="!!url()"
                                [disabled]="busy()" (chosen)="chosen.emit($event)" />
    </div>
  `,
})
export class ImageSlotEditorComponent {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly url = input<string | null>(null);
  readonly pending = input(false);
  readonly busy = input(false);
  readonly chosen = output<IChosenImage>();
}
