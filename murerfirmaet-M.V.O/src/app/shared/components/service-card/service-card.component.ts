import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { IProvidedService } from '../../../core/interfaces/provided-service.interface';

@Component({
  selector: 'mvo-service-card',
  imports: [FaIconComponent, TranslatePipe],
  templateUrl: './service-card.component.html',
  styleUrl: './service-card.component.scss',
  standalone: true
})
export class ServiceCardComponent {
  providedService = input<IProvidedService>();
  protected readonly faArrowRight = faArrowRight;
}
