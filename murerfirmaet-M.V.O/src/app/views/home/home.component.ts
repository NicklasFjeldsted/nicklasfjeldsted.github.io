import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ServiceGridComponent} from '../../shared/components/service-grid/service-grid.component';
import {ITrustHighlight} from '../../core/interfaces/trust-highlight.interface';
import {IFeatureHighlight} from '../../core/interfaces/feature-highlight.interface';
import {TrustHighlightComponent} from '../../shared/components/trust-highlight/trust-highlight.component';
import {FeatureHighlightComponent} from '../../shared/components/feature-highlight/feature-highlight.component';
import {ButtonComponent} from '../../shared/components/button/button.component';
import {faClipboardList, faPhoneVolume, faShield} from '@fortawesome/free-solid-svg-icons';
import {UpperCasePipe} from '@angular/common';
import {ButtonSize} from '../../core/enums/button-size.enum';
import {ButtonVariant} from '../../core/enums/button-variant.enum';
import {ContactConstants} from '../../core/constants/contact.constants';
import {faFileLines, faMessage, faSmile} from '@fortawesome/free-regular-svg-icons';

@Component({
  selector: 'mvo-home',
  imports: [ServiceGridComponent, TrustHighlightComponent, FeatureHighlightComponent, ButtonComponent, TranslatePipe, UpperCasePipe],
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

  protected features: IFeatureHighlight[] = [
    {icon: faSmile, titleKey: 'features.satisfaction.title', descriptionKey: 'features.satisfaction.description'},
    {icon: faMessage, titleKey: 'features.communication.title', descriptionKey: 'features.communication.description'},
    {icon: faFileLines, titleKey: 'features.transparency.title', descriptionKey: 'features.transparency.description'},
    {icon: faShield, titleKey: 'features.insurance.title', descriptionKey: 'features.insurance.description'},
  ];

  protected readonly callHref = `tel:+${ContactConstants.PHONE_NUMBER}`;

  protected readonly faClipboardList = faClipboardList;
  protected readonly faPhoneVolume = faPhoneVolume;
  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
}
