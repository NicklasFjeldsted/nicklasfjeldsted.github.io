import {Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faCalendar, faLocationDot} from '@fortawesome/free-solid-svg-icons';
import {IProject} from '../../../core/interfaces/project.interface';
import {MonthYearPipe} from '../../pipes/month-year.pipe';
import {ProjectViewerComponent} from '../project-viewer/project-viewer.component';
import {RevealDirective} from '../../directives/reveal.directive';

/** One of the three projects at the top of the Projekter page. Also used as the live preview in the admin. */
@Component({
  selector: 'mvo-project-section',
  imports: [RouterLink, TranslatePipe, FaIconComponent, MonthYearPipe, ProjectViewerComponent, RevealDirective],
  templateUrl: './project-section.component.html',
  styleUrl: './project-section.component.scss',
  standalone: true,
})
export class ProjectSectionComponent {
  project = input.required<IProject>();
  /** Position on the page, from 0. Odd positions put the images on the right. */
  index = input(0);

  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faCalendar = faCalendar;
}
