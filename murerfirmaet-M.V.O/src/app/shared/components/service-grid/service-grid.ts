import {Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {IProvidedService} from '../../../core/interfaces/provided-service.interface';
import {ServiceCard} from '../service-card/service-card';

@Component({
    selector: 'mvo-service-grid',
    imports: [ServiceCard, TranslatePipe],
    templateUrl: './service-grid.html',
    styleUrl: './service-grid.scss',
    standalone: true
})
export class ServiceGrid {
    providedServices: IProvidedService[] = [
        {titleKey: 'services.bathrooms.title', descriptionKey: 'services.bathrooms.description', image: 'bathrooms/bathroom4.png'},
        {titleKey: 'services.tiling.title', descriptionKey: 'services.tiling.description', image: 'tile-work/image9.jpeg'},
        {titleKey: 'services.repairs.title', descriptionKey: 'services.repairs.description', image: 'tile-work/image9.jpeg'},
        {titleKey: 'services.facade.title', descriptionKey: 'services.facade.description', image: 'tile-work/image9.jpeg'},
        {titleKey: 'services.minor.title', descriptionKey: 'services.minor.description', image: 'tile-work/image9.jpeg'},
    ];
}
