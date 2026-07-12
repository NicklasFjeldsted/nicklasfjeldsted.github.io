import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IProvidedService } from '../../../core/interfaces/provided-service.interface';
import { ServiceCardComponent } from '../service-card/service-card.component';

@Component({
  selector: 'mvo-service-grid',
  imports: [ServiceCardComponent, TranslatePipe],
  templateUrl: './service-grid.component.html',
  styleUrl: './service-grid.component.scss',
  standalone: true
})
export class ServiceGridComponent {
  providedServices: IProvidedService[] = [
    { titleKey: 'services.bathrooms.title', descriptionKey: 'services.bathrooms.description', image: 'bathrooms/bathroom4.png' },
    { titleKey: 'services.tiling.title',    descriptionKey: 'services.tiling.description',    image: 'tile-work/image9.jpeg' },
    { titleKey: 'services.repairs.title',   descriptionKey: 'services.repairs.description',   image: 'tile-work/image9.jpeg' },
    { titleKey: 'services.facade.title',    descriptionKey: 'services.facade.description',    image: 'tile-work/image9.jpeg' },
    { titleKey: 'services.minor.title',     descriptionKey: 'services.minor.description',     image: 'tile-work/image9.jpeg' },
  ];
}
