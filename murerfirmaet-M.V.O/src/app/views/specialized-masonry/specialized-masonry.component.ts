import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MasonryContentService} from '../../core/services/masonry-content.service';
import {MasonryShowcaseComponent} from '../../shared/components/masonry-showcase/masonry-showcase.component';
import {RevealDirective} from '../../shared/directives/reveal.directive';

@Component({
  selector: 'mvo-specialized-masonry',
  imports: [MasonryShowcaseComponent, RevealDirective],
  templateUrl: './specialized-masonry.component.html',
  styleUrl: './specialized-masonry.component.scss',
  standalone: true,
})
export class SpecializedMasonryComponent {
  protected readonly page = toSignal(inject(MasonryContentService).getSpecializedMasonryPage());
}
