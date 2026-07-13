import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ServiceGridComponent} from '../../shared/components/service-grid/service-grid.component';
import {ITrustHighlight} from '../../core/interfaces/trust-highlight.interface';
import {IFeatureHighlight} from '../../core/interfaces/feature-highlight.interface';
import {TrustHighlightComponent} from '../../shared/components/trust-highlight/trust-highlight.component';
import {FeatureHighlightComponent} from '../../shared/components/feature-highlight/feature-highlight.component';
import {ButtonComponent} from '../../shared/components/button/button.component';
import {faCircleCheck, faClipboardList, faHammer, faPhone, faPhoneVolume, faShield} from '@fortawesome/free-solid-svg-icons';
import {UpperCasePipe} from '@angular/common';
import {ButtonSize} from '../../core/enums/button-size.enum';
import {ButtonVariant} from '../../core/enums/button-variant.enum';
import {ContactConstants} from '../../core/constants/contact.constants';
import {faFileLines, faMessage, faSmile} from '@fortawesome/free-regular-svg-icons';
import {ServiceCardComponent} from '../../shared/components/service-card/service-card.component';
import {WorkStepComponent} from '../../shared/components/work-step/work-step.component';
import {IWorkStep} from '../../core/interfaces/work-step.interface';
import {ProjectCarouselComponent} from '../../shared/components/project-carousel/project-carousel.component';

@Component({
  selector: 'mvo-home',
  imports: [ServiceGridComponent, TrustHighlightComponent, FeatureHighlightComponent, WorkStepComponent, ProjectCarouselComponent, ButtonComponent, TranslatePipe, UpperCasePipe, ServiceCardComponent],
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

  protected readonly projectImages: string[] = [
    'bathrooms/bathroom1.png',
    'bathrooms/bathroom2.png',
    'bathrooms/bathroom3.png',
    'bathrooms/bathroom4.png',
    'bathrooms/bathroom5.png',
    'tile-work/image0.png',
    'tile-work/image1.jpeg',
    'tile-work/image2.jpeg',
    'tile-work/image3.jpeg',
    'tile-work/image4.png',
    'tile-work/image5.jpeg',
    'tile-work/image7.jpeg',
    'tile-work/image8.jpeg',
    'tile-work/image9.jpeg',
  ];

  protected workSteps: IWorkStep[] = [
    { index: 1, titleKey: 'howWeWork.step1.title', descriptionKey: 'howWeWork.step1.description', icon: faPhone },
    { index: 2, titleKey: 'howWeWork.step2.title', descriptionKey: 'howWeWork.step2.description', icon: faFileLines },
    { index: 3, titleKey: 'howWeWork.step3.title', descriptionKey: 'howWeWork.step3.description', icon: faHammer },
    { index: 4, titleKey: 'howWeWork.step4.title', descriptionKey: 'howWeWork.step4.description', icon: faCircleCheck},
  ];

  protected readonly faClipboardList = faClipboardList;
  protected readonly faPhoneVolume = faPhoneVolume;
  protected readonly ButtonSize = ButtonSize;
  protected readonly ButtonVariant = ButtonVariant;
}
