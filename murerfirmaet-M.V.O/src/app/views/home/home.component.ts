import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ServiceGridComponent} from '../../shared/components/service-grid/service-grid.component';
import {ITrustHighlight} from '../../core/interfaces/trust-highlight.interface';
import {TrustHighlightComponent} from '../../shared/components/trust-highlight/trust-highlight.component';
import {ButtonComponent} from '../../shared/components/button/button.component';
import {faClipboardList, faPhoneVolume} from '@fortawesome/free-solid-svg-icons';
import {UpperCasePipe} from '@angular/common';
import {ButtonSize} from '../../core/enums/button-size.enum';
import {ButtonVariant} from '../../core/enums/button-variant.enum';
import {ContactConstants} from '../../core/constants/contact.constants';

@Component({
  selector: 'mvo-home',
  imports: [ServiceGridComponent, TrustHighlightComponent, ButtonComponent, TranslatePipe, UpperCasePipe],
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

  protected readonly callHref = `tel:+${ContactConstants.PHONE_NUMBER}`;

  protected readonly faClipboardList = faClipboardList;
  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly faPhoneVolume = faPhoneVolume;
}
