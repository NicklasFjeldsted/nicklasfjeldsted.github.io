import { Component } from '@angular/core';
import {IProvidedService} from '../../../core/interfaces/provided-service.interface';
import {ServiceCard} from '../service-card/service-card';

@Component({
  selector: 'mvo-service-grid',
  imports: [ServiceCard],
  templateUrl: './service-grid.html',
  styleUrl: './service-grid.scss',
  standalone: true
})
export class ServiceGrid {
  providedServices: IProvidedService[] = [
    {
      title: "Badeværelser",
      description: "Vi opbygger og renoverer badeværelser med fokus på kvalitet, funktion og et flot resultat",
      image: "bathrooms/bathroom4.png"
    },
    {
      title: "Flisearbejde",
      description: "Flisearbejde udført med precision og sans for detaljen - både gulv og væg.",
      image: "tile-work/image9.jpeg"
    },
    {
      title: "Reparationer",
      description: "Vi udfører reparationer og sikrer korrekt opbygning - så det holder i længden.",
      image: "tile-work/image9.jpeg"
    },
    {
      title: "Facaderenovering",
      description: "VI renoverer facader og sikrer et flot udtryk og beskyttelse i mange år frem.",
      image: "tile-work/image9.jpeg"
    },
    {
      title: "Mindre mureropgaver",
      description: "Intet projekt er for lille. Vi hjælper også med mindre opgaver i hjem og erhverv.",
      image: "tile-work/image9.jpeg"
    }
  ]
}
