import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faCalendar, faLocationDot, faPhone} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../core/constants/contact.constants';
import {QuoteCategory} from '../../core/constants/quote-categories.constants';
import {IProject} from '../../core/interfaces/project.interface';
import {ProjectsService} from '../../core/services/projects.service';
import {MonthYearPipe} from '../../shared/pipes/month-year.pipe';
import {ProjectViewerComponent} from '../../shared/components/project-viewer/project-viewer.component';
import {ProjectDialogComponent} from '../../shared/components/project-dialog/project-dialog.component';
import {RevealDirective} from '../../shared/directives/reveal.directive';

interface IGalleryTile {
  project: IProject;
  imageIndex: number;
  url: string;
}

@Component({
  selector: 'mvo-projects',
  imports: [RouterLink, TranslatePipe, FaIconComponent, MonthYearPipe, ProjectViewerComponent, ProjectDialogComponent, RevealDirective],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  standalone: true,
})
export class ProjectsComponent {
  private readonly projects = toSignal(inject(ProjectsService).getProjects(), {initialValue: []});

  protected readonly featured = computed(() => ProjectsService.pickFeatured(this.projects()));

  /** Only categories that have at least one project get a filter button. */
  protected readonly categories = computed(() => [...new Set(this.projects().map(p => p.category))]);
  protected readonly filter = signal<QuoteCategory | null>(null);

  /** Every image from every project; a tap opens that image's project. */
  protected readonly tiles = computed<IGalleryTile[]>(() =>
    this.projects()
      .filter(p => !this.filter() || p.category === this.filter())
      .flatMap(project => project.images.map((image, imageIndex) => ({project, imageIndex, url: image.url}))),
  );

  protected readonly open = signal<IGalleryTile | null>(null);

  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faCalendar = faCalendar;
  protected readonly faPhone = faPhone;
}
