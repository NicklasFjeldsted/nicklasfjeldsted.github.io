import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { IFeatureHighlight } from '../../../core/interfaces/feature-highlight.interface';

@Component({
  selector: 'mvo-feature-highlight',
  imports: [FaIconComponent, TranslatePipe],
  templateUrl: './feature-highlight.component.html',
  styleUrl: './feature-highlight.component.scss',
  standalone: true,
})
export class FeatureHighlightComponent {
  highlight = input.required<IFeatureHighlight>();
}

