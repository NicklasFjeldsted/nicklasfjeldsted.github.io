import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {API_BASE_URL, mediaUrl} from '../core/config/api.config';
import {
  IApiError, IGalleryImageInput, IHomePartSave, IMedia, IMediaDetail, IMediaPage, IMediaQuery, IPageDetail, IPageListItem, IProjectDetail,
  IProjectInput, IProjectListItem, ISectionContent, ISectionContentSave,
} from './admin.models';

const BASE = `${API_BASE_URL}/api/admin`;

export interface ISectionTextUpdate {
  title: string;
  eyebrow: string | null;
  introduction: string | null;
  description: string;
  additionalDescription: string | null;
  details: string[];
}

/** Single access point for the admin endpoints. Every call returns the server-confirmed state. */
@Injectable({providedIn: 'root'})
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getPages(): Observable<IPageListItem[]> {
    return this.http.get<IPageListItem[]>(`${BASE}/pages`).pipe(this.fail());
  }

  getPage(pageId: number): Observable<IPageDetail> {
    return this.http.get<IPageDetail>(`${BASE}/pages/${pageId}`).pipe(this.fail());
  }

  updatePageText(pageId: number, expectedVersion: number, eyebrow: string | null, heading: string, introduction: string) {
    return this.http
      .put<IPageDetail>(`${BASE}/pages/${pageId}/text`, {expectedVersion, eyebrow, heading, introduction})
      .pipe(this.fail());
  }

  reorderSections(pageId: number, expectedPageVersion: number, orderedSectionIds: number[]) {
    return this.http
      .put<IPageDetail>(`${BASE}/pages/${pageId}/sections/order`, {expectedPageVersion, orderedSectionIds})
      .pipe(this.fail());
  }

  /** A new section starts as a title only; texts and images are added to it afterwards. */
  createSection(pageId: number, title: string) {
    return this.http.post<ISectionContent>(`${BASE}/pages/${pageId}/sections`, {title})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  /** Saves the section's texts, points and images in one request. */
  saveSectionContent(pageId: number, sectionId: number, expectedVersion: number, content: ISectionContentSave) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/content`, {expectedVersion, ...content})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  saveHomePart(pageId: number, sectionId: number, expectedVersion: number, part: IHomePartSave) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/home-part`, {expectedVersion, ...part})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  getSection(pageId: number, sectionId: number) {
    return this.http.get<ISectionContent>(this.section(pageId, sectionId)).pipe(map(s => this.withUrls(s)), this.fail());
  }

  updateSectionText(pageId: number, sectionId: number, expectedVersion: number, text: ISectionTextUpdate) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/text`, {expectedVersion, ...text})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  setVisibility(pageId: number, sectionId: number, expectedVersion: number, isPublished: boolean) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/visibility`, {expectedVersion, isPublished})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  deleteSection(pageId: number, sectionId: number, expectedVersion: number) {
    return this.http.delete<void>(this.section(pageId, sectionId), {params: {expectedVersion}}).pipe(this.fail());
  }

  setPrimaryImage(pageId: number, sectionId: number, expectedVersion: number, mediaId: number, altText: string | null) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/primary-image`, {expectedVersion, mediaId, altText})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  addGalleryImages(pageId: number, sectionId: number, expectedVersion: number, images: IGalleryImageInput[]) {
    return this.http.post<ISectionContent>(`${this.section(pageId, sectionId)}/gallery`, {expectedVersion, images})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  /** Saves the whole gallery (images and order) in one go. Images already in the gallery keep their alt text. */
  setGallery(pageId: number, sectionId: number, expectedVersion: number, images: IGalleryImageInput[]) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/gallery`, {expectedVersion, images})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  replaceGalleryImage(pageId: number, sectionId: number, expectedVersion: number, galleryImageId: number, mediaId: number, altText: string | null) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/gallery/${galleryImageId}`, {expectedVersion, mediaId, altText})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  removeGalleryImage(pageId: number, sectionId: number, expectedVersion: number, galleryImageId: number) {
    return this.http.delete<ISectionContent>(`${this.section(pageId, sectionId)}/gallery/${galleryImageId}`, {params: {expectedVersion}})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  reorderGallery(pageId: number, sectionId: number, expectedVersion: number, orderedGalleryImageIds: number[]) {
    return this.http.put<ISectionContent>(`${this.section(pageId, sectionId)}/gallery/order`, {expectedVersion, orderedGalleryImageIds})
      .pipe(map(s => this.withUrls(s)), this.fail());
  }

  /** Uploads one image to the image library. `name` is the display name; the server falls back to the file name. */
  uploadMedia(file: File, name?: string | null): Observable<IMedia> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (name?.trim()) form.append('name', name.trim());
    return this.http.post<IMedia>(`${BASE}/media`, form).pipe(map(m => ({...m, url: mediaUrl(m.url)})), this.fail());
  }

  listMedia(query: IMediaQuery): Observable<IMediaPage> {
    const params = {search: query.search, filter: query.filter, sort: query.sort, skip: query.skip, take: query.take};
    return this.http.get<IMediaPage>(`${BASE}/media`, {params}).pipe(
      map(page => ({...page, items: page.items.map(m => ({...m, url: mediaUrl(m.url)}))})),
      this.fail(),
    );
  }

  getMedia(mediaId: number): Observable<IMediaDetail> {
    return this.http.get<IMediaDetail>(`${BASE}/media/${mediaId}`).pipe(map(m => ({...m, url: mediaUrl(m.url)})), this.fail());
  }

  updateMedia(mediaId: number, name: string, defaultAltText: string | null): Observable<IMediaDetail> {
    return this.http.put<IMediaDetail>(`${BASE}/media/${mediaId}`, {name, defaultAltText})
      .pipe(map(m => ({...m, url: mediaUrl(m.url)})), this.fail());
  }

  /** Permanently deletes an image from the library. The server refuses while the image is used on the website. */
  deleteMedia(mediaId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/media/${mediaId}`).pipe(this.fail());
  }

  getProjects(): Observable<IProjectListItem[]> {
    return this.http.get<IProjectListItem[]>(`${BASE}/projects`).pipe(
      map(list => list.map(p => ({...p, coverUrl: p.coverUrl && mediaUrl(p.coverUrl)}))),
      this.fail(),
    );
  }

  getProject(projectId: number): Observable<IProjectDetail> {
    return this.http.get<IProjectDetail>(`${BASE}/projects/${projectId}`).pipe(map(p => this.projectUrls(p)), this.fail());
  }

  createProject(project: IProjectInput): Observable<IProjectDetail> {
    return this.http.post<IProjectDetail>(`${BASE}/projects`, project).pipe(map(p => this.projectUrls(p)), this.fail());
  }

  /** Saves the whole project (text, settings and images in order) in one request. */
  updateProject(projectId: number, expectedVersion: number, project: IProjectInput): Observable<IProjectDetail> {
    return this.http.put<IProjectDetail>(`${BASE}/projects/${projectId}`, {expectedVersion, project})
      .pipe(map(p => this.projectUrls(p)), this.fail());
  }

  /** Deletes the project. Its images stay in the image library. */
  deleteProject(projectId: number, expectedVersion: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/projects/${projectId}`, {params: {expectedVersion}}).pipe(this.fail());
  }

  private projectUrls(project: IProjectDetail): IProjectDetail {
    return {...project, images: project.images.map(i => ({...i, url: mediaUrl(i.url)}))};
  }

  private section(pageId: number, sectionId: number): string {
    return `${BASE}/pages/${pageId}/sections/${sectionId}`;
  }

  private withUrls(section: ISectionContent): ISectionContent {
    return {
      ...section,
      primaryImage: section.primaryImage && {...section.primaryImage, url: mediaUrl(section.primaryImage.url)},
      gallery: section.gallery.map(g => ({...g, url: mediaUrl(g.url)})),
    };
  }

  private fail<T>() {
    return catchError<T, Observable<never>>((error: HttpErrorResponse) => throwError(() => toApiError(error)));
  }
}

export function toApiError(error: HttpErrorResponse): IApiError {
  if (error.status === 0) return {status: 0, message: 'Der er ingen forbindelse til serveren. Dine ændringer er ikke gemt.', fields: {}};
  const body = error.error as {title?: string; detail?: string; errors?: Record<string, string[]>} | null;
  return {
    status: error.status,
    message: body?.detail ?? body?.title ?? 'Der opstod en uventet fejl. Dine ændringer er ikke gemt.',
    fields: body?.errors ?? {},
  };
}
