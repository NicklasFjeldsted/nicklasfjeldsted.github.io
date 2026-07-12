import {Component, input} from '@angular/core';
import {IProvidedService} from '../../../core/interfaces/provided-service.interface';
import {faArrowRight} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'mvo-service-card',
  imports: [
    FaIconComponent
  ],
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss',
  standalone: true
})
export class ServiceCard {
  providedService = input<IProvidedService>();
  protected readonly faArrowRight = faArrowRight;
}
