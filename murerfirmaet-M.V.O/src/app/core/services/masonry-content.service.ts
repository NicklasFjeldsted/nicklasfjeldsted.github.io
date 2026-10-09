import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {API_BASE_URL, mediaUrl} from '../config/api.config';
import {IMasonryImage, ISpecializedMasonryPage} from '../interfaces/masonry-page.interface';
import {SPECIALIZED_MASONRY_PLACEHOLDER} from '../data/specialized-masonry.placeholder';

const SLUG = 'specialiseret-murerarbejde';

interface IPublicImage {id: string; url: string; alt: string}
interface IPublicSection {
  id: string; title: string; eyebrow: string | null; introduction: string | null; description: string;
  additionalDescription: string | null; details: string[]; primaryImage: IPublicImage | null;
  gallery: IPublicImage[]; displayOrder: number;
}
interface IPublicPage {eyebrow: string | null; heading: string; introduction: string; sections: IPublicSection[]}

@Injectable({providedIn: 'root'})
export class MasonryContentService {
  private readonly http = inject(HttpClient);

  /** Loads the page from the API; falls back to the bundled placeholder content if the API cannot be reached. */
  getSpecializedMasonryPage(): Observable<ISpecializedMasonryPage> {
    return this.http.get<IPublicPage>(`${API_BASE_URL}/api/pages/${SLUG}`).pipe(
      map(page => this.toPage(page)),
      catchError(error => {
        console.warn('Indholds-API utilgængeligt - viser standardindhold.', error);
        return of(this.placeholder());
      }),
    );
  }

  private placeholder(): ISpecializedMasonryPage {
    const page = SPECIALIZED_MASONRY_PLACEHOLDER;
    return {
      ...page,
      sections: page.sections.filter(s => s.published).sort((a, b) => a.displayOrder - b.displayOrder),
    };
  }

  private toPage(page: IPublicPage): ISpecializedMasonryPage {
    return {
      eyebrow: page.eyebrow ?? undefined,
      heading: page.heading,
      introduction: page.introduction,
      sections: [...page.sections]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(s => ({
          id: s.id,
          title: s.title,
          eyebrow: s.eyebrow ?? undefined,
          introduction: s.introduction ?? undefined,
          description: s.description,
          additionalDescription: s.additionalDescription ?? undefined,
          details: s.details,
          primaryImage: s.primaryImage ? this.image(s.primaryImage) : undefined,
          gallery: s.gallery.map(g => this.image(g)),
          displayOrder: s.displayOrder,
          published: true,
        })),
    };
  }

  private image(image: IPublicImage): IMasonryImage {
    return {id: String(image.id), url: mediaUrl(image.url), alt: image.alt};
  }
}
