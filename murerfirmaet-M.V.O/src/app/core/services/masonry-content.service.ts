import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {ISpecializedMasonryPage} from '../interfaces/masonry-page.interface';
import {SPECIALIZED_MASONRY_PLACEHOLDER} from '../data/specialized-masonry.placeholder';

@Injectable({providedIn: 'root'})
export class MasonryContentService {
  getSpecializedMasonryPage(): Observable<ISpecializedMasonryPage> {
    return of(SPECIALIZED_MASONRY_PLACEHOLDER).pipe(
      map(page => ({
        ...page,
        sections: page.sections
          .filter(section => section.published)
          .sort((a, b) => a.displayOrder - b.displayOrder),
      })),
    );
  }
}
