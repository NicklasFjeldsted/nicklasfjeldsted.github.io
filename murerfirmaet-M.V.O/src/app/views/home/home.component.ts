import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {HOME_FALLBACK_PROJECT_IMAGES, HOME_PARTS} from '../../core/interfaces/home-page.interface';
import {IProject} from '../../core/interfaces/project.interface';
import {HomeContentService} from '../../core/services/home-content.service';
import {ProjectsService} from '../../core/services/projects.service';
import {HomePartComponent} from '../../shared/components/home-part/home-part.component';
import {ICarouselItem} from '../../shared/components/project-carousel/project-carousel.component';

/** How many images of the newest projects the carousel shows at most. */
const CAROUSEL_MAX = 12;

/** The newest projects' covers first, then their other images, so a few projects still fill the carousel. */
export function projectCarouselItems(projects: IProject[]): ICarouselItem[] {
  const item = (p: IProject, url: string): ICarouselItem => ({url, title: p.title, link: `/projekter/${p.slug}`});
  const withImages = projects.filter(p => p.images.length);
  const covers = withImages.map(p => item(p, p.images[0].url));
  const rest = withImages.flatMap(p => p.images.slice(1).map(i => item(p, i.url)));
  return [...covers, ...rest].slice(0, CAROUSEL_MAX);
}

const FALLBACK_ITEMS: ICarouselItem[] = HOME_FALLBACK_PROJECT_IMAGES.map(url => ({url}));

@Component({
  selector: 'mvo-home',
  imports: [HomePartComponent],
  templateUrl: './home.component.html',
  standalone: true
})
export class HomeComponent {
  protected readonly parts = HOME_PARTS;
  protected readonly content = toSignal(inject(HomeContentService).getHomePage());

  /** The carousel shows the projects from the Projekter page, newest first; the old photos until there are any. */
  protected readonly projectImages = toSignal(
    inject(ProjectsService).getProjects().pipe(
      map(projects => projectCarouselItems(projects)),
      map(items => (items.length ? items : FALLBACK_ITEMS)),
      catchError(() => of(FALLBACK_ITEMS)),
    ),
    {initialValue: [] as ICarouselItem[]},
  );
}
