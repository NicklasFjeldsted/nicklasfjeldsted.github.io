import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEnvelope, faLocationDot, faPhone} from '@fortawesome/free-solid-svg-icons';
import {faFacebookF, faInstagram} from '@fortawesome/free-brands-svg-icons';
import {QuoteFormComponent} from '../../shared/components/quote-form/quote-form.component';
import {ContactConstants} from '../../core/constants/contact.constants';

@Component({
  selector: 'mvo-contact',
  imports: [TranslatePipe, FaIconComponent, QuoteFormComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  standalone: true
})
export class ContactComponent {
  protected readonly ContactConstants = ContactConstants;
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly mailHref = `mailto:${ContactConstants.EMAIL_ADDRESS}`;

  protected readonly faPhone = faPhone;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faFacebookF = faFacebookF;
  protected readonly faInstagram = faInstagram;
}
