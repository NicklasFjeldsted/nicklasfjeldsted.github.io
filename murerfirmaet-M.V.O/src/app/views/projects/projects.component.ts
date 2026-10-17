import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faPhone} from '@fortawesome/free-solid-svg-icons';
import {of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {ContactConstants} from '../../core/constants/contact.constants';
import {QuoteCategory} from '../../core/constants/quote-categories.constants';
import {IProject} from '../../core/interfaces/project.interface';
import {ProjectsService} from '../../core/services/projects.service';
import {ProjectDialogComponent} from '../../shared/components/project-dialog/project-dialog.component';
import {ProjectSectionComponent} from '../../shared/components/project-section/project-section.component';

interface IGalleryTile {
  project: IProject;
  imageIndex: number;
  url: string;
}

@Component({
  selector: 'mvo-projects',
  imports: [RouterLink, TranslatePipe, FaIconComponent, ProjectDialogComponent, ProjectSectionComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  standalone: true,
})
export class ProjectsComponent {
  /** Undefined while loading, null when the projects could not be fetched. */
  private readonly loaded = toSignal(inject(ProjectsService).getProjects().pipe(
    catchError(error => {
      console.warn('Projekterne kunne ikke hentes.', error);
      return of(null);
    }),
  ));
  private readonly projects = computed(() => this.loaded() ?? []);
  protected readonly loading = computed(() => this.loaded() === undefined);
  protected readonly failed = computed(() => this.loaded() === null);

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
  protected readonly faPhone = faPhone;
}
