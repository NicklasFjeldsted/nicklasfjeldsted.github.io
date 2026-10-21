import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {API_BASE_URL, mediaUrl} from '../config/api.config';
import {HOME_FALLBACK, IHomeContent, toHomeContent} from '../interfaces/home-page.interface';

const SLUG = 'forside';

interface IPublicHomeSection {
  key: string | null; title: string; eyebrow: string | null; description: string;
  items: {text: string; description: string | null; icon: string | null}[];
  primaryImage: {url: string} | null;
}

@Injectable({providedIn: 'root'})
export class HomeContentService {
  private readonly http = inject(HttpClient);

  getHomePage(): Observable<IHomeContent> {
    return this.http.get<{sections: IPublicHomeSection[]}>(`${API_BASE_URL}/api/pages/${SLUG}`).pipe(
      map(page => toHomeContent(page.sections.map(s => ({...s, imageUrl: s.primaryImage ? mediaUrl(s.primaryImage.url) : null})))),
      catchError(error => {
        console.warn('Indholds-API utilgængeligt - viser standardindhold.', error);
        return of(HOME_FALLBACK);
      }),
    );
  }
}
