import { Component } from '@angular/core';
import {ServiceGrid} from '../../shared/components/service-grid/service-grid';
import {ITrustHighlight} from '../../core/interfaces/trust-highlight.interface';
import {TrustHighlightComponent} from '../../shared/components/trust-highlight/trust-highlight.component';

@Component({
  selector: 'mvo-home',
  imports: [
    ServiceGrid,
    TrustHighlightComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  standalone: true
})
export class HomeComponent {
  highlights: ITrustHighlight[] = [
    { icon: 'shield',    title: '+5 års erfaring',          description: 'Solidt håndværk og mange tilfredse kunder' },
    { icon: 'check',     title: 'Gratis og uforpligtende',  description: 'Få et tilbud helt gratis – uden bindinger' },
    { icon: 'clock',     title: 'Svar indenfor 24 timer',   description: 'Vi vender hurtigt tilbage med et konkret tilbud' },
    { icon: 'location-dot', title: 'København & omegn',     description: 'Vi hjælper hele København og Nordsjælland' },
  ];
}
