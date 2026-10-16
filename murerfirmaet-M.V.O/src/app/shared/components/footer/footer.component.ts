import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faFacebookF, faInstagram} from '@fortawesome/free-brands-svg-icons';
import {
  faChevronRight,
  faEnvelope,
  faLink,
  faLocationDot,
  faPhone,
  faTrowel,
} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../../core/constants/contact.constants';

interface IFooterLink {
  labelKey: string;
  path: string;
  fragment?: string;
}

@Component({
  selector: 'mvo-footer',
  imports: [RouterLink, TranslatePipe, FaIconComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  standalone: true,
})
export class FooterComponent {
  // "Projekter" has no page yet, so it points to the home page until one is built.
  protected readonly quickLinks: IFooterLink[] = [
    {labelKey: 'footer.links.home', path: '/'},
    {labelKey: 'footer.links.services', path: '/ydelser'},
    {labelKey: 'footer.links.projects', path: '/'},
    {labelKey: 'footer.links.about', path: '/om-os'},
    {labelKey: 'footer.links.contact', path: '/kontakt'},
  ];

  protected readonly serviceLinks: IFooterLink[] = [
    {labelKey: 'services.bathrooms.title', path: '/ydelser', fragment: 'badevaerelser'},
    {labelKey: 'services.tiling.title', path: '/ydelser', fragment: 'fliser'},
    {labelKey: 'services.repairs.title', path: '/ydelser', fragment: 'reparationer'},
    {labelKey: 'services.facade.title', path: '/ydelser', fragment: 'facade'},
    {labelKey: 'services.minor.title', path: '/ydelser', fragment: 'mindre-opgaver'},
  ];

  protected readonly companyName = ContactConstants.COMPANY_NAME;
  protected readonly cvr = ContactConstants.CVR;
  protected readonly phoneNumber = ContactConstants.PHONE_NUMBER;
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly email = ContactConstants.EMAIL_ADDRESS;
  protected readonly facebookUrl = ContactConstants.FACEBOOK_URL;
  protected readonly instagramUrl = ContactConstants.INSTAGRAM_URL;
  protected readonly year = new Date().getFullYear();

  protected readonly faPhone = faPhone;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faLink = faLink;
  protected readonly faTrowel = faTrowel;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faFacebook = faFacebookF;
  protected readonly faInstagram = faInstagram;
}
