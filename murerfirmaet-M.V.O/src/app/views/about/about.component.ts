import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faHandshake, faPhone, faRulerCombined, faUserCheck} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../core/constants/contact.constants';

@Component({
  selector: 'mvo-about',
  imports: [RouterLink, FaIconComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  standalone: true,
})
export class AboutComponent {
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faPhone = faPhone;

  protected readonly values = [
    {icon: faRulerCombined, title: 'Kvalitet ned til detaljen', text: 'Lige fuger, korrekt opbygning og et resultat, der holder i mange år.'},
    {icon: faHandshake, title: 'Ærlige aftaler', text: 'Du får en klar pris og en klar plan, før vi går i gang. Ingen overraskelser.'},
    {icon: faUserCheck, title: 'Du taler med mureren', text: 'Den samme person fra første besøg til aflevering, og altid til at få fat på.'},
  ];
}
