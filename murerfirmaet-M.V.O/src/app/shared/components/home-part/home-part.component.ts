import {Component, computed, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheckCircle} from '@fortawesome/free-regular-svg-icons';
import {faArrowRightLong, faPhone} from '@fortawesome/free-solid-svg-icons';
import {TranslatePipe} from '@ngx-translate/core';
import {ContactConstants} from '../../../core/constants/contact.constants';
import {HomePartKey, IHomeContent, homeIcon} from '../../../core/interfaces/home-page.interface';
import {FeatureHighlightComponent} from '../feature-highlight/feature-highlight.component';
import {ICarouselItem, ProjectCarouselComponent} from '../project-carousel/project-carousel.component';
import {QuoteFormComponent} from '../quote-form/quote-form.component';
import {ServiceGridComponent} from '../service-grid/service-grid.component';
import {TrustHighlightComponent} from '../trust-highlight/trust-highlight.component';
import {WorkStepComponent} from '../work-step/work-step.component';

/**
 * One part of the home page. The home page shows all six; the admin page shows the one being edited as its preview,
 * with the quote form replaced by a placeholder.
 */
@Component({
  selector: 'mvo-home-part',
  imports: [
    ServiceGridComponent, TrustHighlightComponent, FeatureHighlightComponent, WorkStepComponent, ProjectCarouselComponent,
    QuoteFormComponent, TranslatePipe, FaIconComponent, RouterLink,
  ],
  templateUrl: './home-part.component.html',
  styleUrl: './home-part.component.scss',
  standalone: true,
})
export class HomePartComponent {
  readonly part = input.required<HomePartKey>();
  readonly content = input.required<IHomeContent>();
  /** Images of the newest projects, for the projects part. */
  readonly projectImages = input<ICarouselItem[]>([]);
  readonly preview = input(false);

  protected readonly heroImage = computed(() => `url("${this.content().hero.imageUrl}")`);
  protected readonly icon = homeIcon;
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faCheckCircle = faCheckCircle;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faPhone = faPhone;

  // The last word of the hero heading is shown in gold, as in the brand design.
  protected headingLead(heading: string): string {
    const i = heading.trimEnd().lastIndexOf(' ');
    return i === -1 ? '' : heading.slice(0, i + 1);
  }

  protected headingAccent(heading: string): string {
    const i = heading.trimEnd().lastIndexOf(' ');
    return i === -1 ? heading : heading.slice(i + 1);
  }
}
