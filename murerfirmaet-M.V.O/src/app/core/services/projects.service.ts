import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {IProject} from '../interfaces/project.interface';
import {PROJECTS_PLACEHOLDER} from '../data/projects.placeholder';

const FEATURED_COUNT = 3;

@Injectable({providedIn: 'root'})
export class ProjectsService {
  /** All projects, newest first. Uses the bundled example projects until the admin part exists. */
  getProjects(): Observable<IProject[]> {
    return of([...PROJECTS_PLACEHOLDER].sort((a, b) => b.completedOn.localeCompare(a.completedOn)));
  }

  getProject(slug: string): Observable<IProject | undefined> {
    return this.getProjects().pipe(map(projects => projects.find(p => p.slug === slug)));
  }

  /** Always three: the featured projects first, topped up with the newest ones. */
  static pickFeatured(projects: IProject[]): IProject[] {
    const featured = projects.filter(p => p.featured);
    const rest = projects.filter(p => !p.featured);
    return [...featured, ...rest].slice(0, FEATURED_COUNT);
  }
}
