import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faCheck, faPhone} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../core/constants/contact.constants';
import {SERVICES} from '../../core/constants/services.constants';

@Component({
  selector: 'mvo-services',
  imports: [RouterLink, TranslatePipe, FaIconComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  standalone: true,
})
export class ServicesComponent {
  protected readonly services = SERVICES;
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faCheck = faCheck;
  protected readonly faPhone = faPhone;
}
