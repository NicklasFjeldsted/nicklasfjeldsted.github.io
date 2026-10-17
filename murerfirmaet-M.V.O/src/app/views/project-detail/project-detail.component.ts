import {Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeftLong, faArrowRightLong, faCalendar, faLocationDot, faPhone} from '@fortawesome/free-solid-svg-icons';
import {of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ContactConstants} from '../../core/constants/contact.constants';
import {ProjectsService} from '../../core/services/projects.service';
import {MonthYearPipe} from '../../shared/pipes/month-year.pipe';
import {ProjectViewerComponent} from '../../shared/components/project-viewer/project-viewer.component';

const OTHER_COUNT = 3;

@Component({
  selector: 'mvo-project-detail',
  imports: [RouterLink, TranslatePipe, FaIconComponent, MonthYearPipe, ProjectViewerComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  standalone: true,
})
export class ProjectDetailComponent {
  private readonly service = inject(ProjectsService);
  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(params => params.get('slug'))));
  /** Undefined while loading, null when the projects could not be fetched. */
  private readonly loaded = toSignal(this.service.getProjects().pipe(catchError(() => of(null))));
  private readonly projects = computed(() => this.loaded() ?? []);

  protected readonly project = computed(() => this.projects().find(p => p.slug === this.slug()));
  protected readonly missing = computed(() => this.loaded() !== undefined && !this.project());
  protected readonly failed = computed(() => this.loaded() === null);

  /** Same category first, so a customer keeps seeing jobs like their own. */
  protected readonly others = computed(() => {
    const current = this.project();
    if (!current) return [];
    const rest = this.projects().filter(p => p.id !== current.id);
    return [...rest.filter(p => p.category === current.category), ...rest.filter(p => p.category !== current.category)].slice(0, OTHER_COUNT);
  });

  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowLeftLong = faArrowLeftLong;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faCalendar = faCalendar;
  protected readonly faPhone = faPhone;
}
