import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IFeatureHighlight } from '../../../core/interfaces/feature-highlight.interface';

@Component({
  selector: 'mvo-feature-highlight',
  imports: [FaIconComponent],
  templateUrl: './feature-highlight.component.html',
  styleUrl: './feature-highlight.component.scss',
  standalone: true,
})
export class FeatureHighlightComponent {
  highlight = input.required<IFeatureHighlight>();
}

