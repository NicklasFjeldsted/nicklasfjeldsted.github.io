import {Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faPhone} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../../core/constants/contact.constants';
import {IAboutProfile} from '../../../core/interfaces/about-page.interface';

/** The fixed "Om os" layout: the mason's photo next to the page text. Also used as the admin preview. */
@Component({
  selector: 'mvo-about-profile',
  imports: [RouterLink, TranslatePipe, FaIconComponent],
  templateUrl: './about-profile.component.html',
  styleUrl: './about-profile.component.scss',
  standalone: true,
})
export class AboutProfileComponent {
  readonly profile = input.required<IAboutProfile>();

  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faPhone = faPhone;

  // The last word of the heading is shown in gold, as on the front page.
  protected headingLead(heading: string): string {
    const i = heading.trimEnd().lastIndexOf(' ');
    return i === -1 ? '' : heading.slice(0, i + 1);
  }

  protected headingAccent(heading: string): string {
    const i = heading.trimEnd().lastIndexOf(' ');
    return i === -1 ? heading : heading.slice(i + 1);
  }
}
