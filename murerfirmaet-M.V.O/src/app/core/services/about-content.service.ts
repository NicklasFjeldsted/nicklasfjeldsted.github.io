import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {API_BASE_URL, mediaUrl} from '../config/api.config';
import {ABOUT_FALLBACK_IMAGE, IAboutProfile, toParagraphs} from '../interfaces/about-page.interface';

const SLUG = 'om-os';

interface IPublicProfileSection {
  type: string; title: string; eyebrow: string | null; description: string; primaryImage: {url: string} | null;
}
interface IPublicAboutPage {eyebrow: string | null; heading: string; introduction: string; sections: IPublicProfileSection[]}

/** Shown when the API cannot be reached. Matches the text the database starts with. */
const PLACEHOLDER: IAboutProfile = {
  eyebrow: 'Om os',
  heading: 'Håndværk med stolthed',
  introduction: 'Murerfirmaet MVO er et lille, lokalt murerfirma i København med speciale i badeværelser, fliser og reparationer.',
  name: 'Mike Osbeck',
  role: 'Murer og indehaver',
  story: [
    'Jeg startede MVO, fordi jeg ville lave murerarbejde på den måde, jeg selv ville have det lavet derhjemme: ordentligt, til tiden og uden smuts. Hver opgave får den samme opmærksomhed, uanset om det er et helt nyt badeværelse eller en revne i facaden.',
    'Når du vælger MVO, er det mig, der kommer ud og ser på opgaven, giver dig prisen og står for arbejdet. Så ved du altid, hvem du taler med.',
  ],
  imageUrl: ABOUT_FALLBACK_IMAGE,
};

@Injectable({providedIn: 'root'})
export class AboutContentService {
  private readonly http = inject(HttpClient);

  getAboutPage(): Observable<IAboutProfile> {
    return this.http.get<IPublicAboutPage>(`${API_BASE_URL}/api/pages/${SLUG}`).pipe(
      map(page => {
        const profile = page.sections.find(s => s.type === 'Profile');
        return {
          eyebrow: page.eyebrow ?? undefined,
          heading: page.heading,
          introduction: page.introduction,
          name: profile?.title ?? PLACEHOLDER.name,
          role: profile ? profile.eyebrow ?? undefined : PLACEHOLDER.role,
          story: profile ? toParagraphs(profile.description) : PLACEHOLDER.story,
          imageUrl: profile?.primaryImage ? mediaUrl(profile.primaryImage.url) : ABOUT_FALLBACK_IMAGE,
        };
      }),
      catchError(error => {
        console.warn('Indholds-API utilgængeligt - viser standardindhold.', error);
        return of(PLACEHOLDER);
      }),
    );
  }
}
