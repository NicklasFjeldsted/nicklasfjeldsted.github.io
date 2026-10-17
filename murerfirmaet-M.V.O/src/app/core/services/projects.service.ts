import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {API_BASE_URL, mediaUrl} from '../config/api.config';
import {QuoteCategory} from '../constants/quote-categories.constants';
import {IProject} from '../interfaces/project.interface';

const FEATURED_COUNT = 3;

interface IPublicProject {
  id: string; slug: string; title: string; category: QuoteCategory; location: string; completedOn: string; summary: string;
  description: string[]; images: {id: string; url: string; alt: string}[]; featured: boolean;
}

@Injectable({providedIn: 'root'})
export class ProjectsService {
  private readonly http = inject(HttpClient);

  /** The visible projects, newest first. Fetched once and shared by the Projekter page and the project pages. */
  private readonly projects$ = this.http.get<IPublicProject[]>(`${API_BASE_URL}/api/projects`).pipe(
    map(list => list.map(p => ({...p, images: p.images.map(i => ({...i, url: mediaUrl(i.url)}))}))),
    shareReplay({bufferSize: 1, refCount: false}),
  );

  getProjects(): Observable<IProject[]> {
    return this.projects$;
  }

  /** Always three when there are enough: the featured projects first, topped up with the newest ones. */
  static pickFeatured(projects: IProject[]): IProject[] {
    const featured = projects.filter(p => p.featured);
    const rest = projects.filter(p => !p.featured);
    return [...featured, ...rest].slice(0, FEATURED_COUNT);
  }
}
