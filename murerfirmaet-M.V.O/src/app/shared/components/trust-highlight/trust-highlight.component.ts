import {Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ITrustHighlight} from '../../../core/interfaces/trust-highlight.interface';

@Component({
  selector: 'mvo-trust-highlight',
  imports: [FaIconComponent, TranslatePipe],
  templateUrl: './trust-highlight.component.html',
  styleUrl: './trust-highlight.component.scss',
  standalone: true
})
export class TrustHighlightComponent {
  readonly highlight = input<ITrustHighlight>();
}
