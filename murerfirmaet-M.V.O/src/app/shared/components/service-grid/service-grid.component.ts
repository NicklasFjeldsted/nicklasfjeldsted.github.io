import {Component, input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {IProvidedService} from '../../../core/interfaces/provided-service.interface';
import {ServiceCardComponent} from '../service-card/service-card.component';

@Component({
  selector: 'mvo-service-grid',
  imports: [ServiceCardComponent, TranslatePipe],
  templateUrl: './service-grid.component.html',
  styleUrl: './service-grid.component.scss',
  standalone: true
})
export class ServiceGridComponent {
  /** The home page's own heading over the cards. Left out, the default texts are used; a null overtext is not shown. */
  readonly eyebrow = input<string | null | undefined>();
  readonly heading = input<string | undefined>();

  providedServices: IProvidedService[] = [
    {serviceId: 'badevaerelser', titleKey: 'services.bathrooms.title', descriptionKey: 'services.bathrooms.description', image: 'bathrooms/bathroom4.png'},
    {serviceId: 'fliser', titleKey: 'services.tiling.title', descriptionKey: 'services.tiling.description', image: 'tile-work/image4.png'},
    {serviceId: 'reparationer', titleKey: 'services.repairs.title', descriptionKey: 'services.repairs.description', image: 'reparations/reparation0.jpeg'},
    {serviceId: 'facade', titleKey: 'services.facade.title', descriptionKey: 'services.facade.description', image: 'tile-work/image9.jpeg'},
    {serviceId: 'mindre-opgaver', titleKey: 'services.minor.title', descriptionKey: 'services.minor.description', image: 'minor-solutions/solution0.png'},
  ];
}
