import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ServiceGridComponent} from '../../shared/components/service-grid/service-grid.component';
import {ITrustHighlight} from '../../core/interfaces/trust-highlight.interface';
import {TrustHighlightComponent} from '../../shared/components/trust-highlight/trust-highlight.component';

@Component({
  selector: 'mvo-home',
  imports: [ServiceGridComponent, TrustHighlightComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true
})
export class HomeComponent {
  protected highlights: ITrustHighlight[] = [
    {icon: 'shield', titleKey: 'highlights.experience.title', descriptionKey: 'highlights.experience.description'},
    {icon: 'check', titleKey: 'highlights.free.title', descriptionKey: 'highlights.free.description'},
    {icon: 'clock', titleKey: 'highlights.response.title', descriptionKey: 'highlights.response.description'},
    {icon: 'location-dot', titleKey: 'highlights.location.title', descriptionKey: 'highlights.location.description'},
  ];
}
