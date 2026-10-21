export interface IPageListItem {
  id: number;
  slug: string;
  name: string;
  isManaged: boolean;
  /** Fixed design: sections can be edited but not added, removed, hidden or moved. */
  hasFixedLayout: boolean;
  sectionCount: number;
  /** False for the home page, whose top is one of its parts instead of an intro text. */
  hasIntro: boolean;
}

export interface ISectionListItem {
  id: number;
  title: string;
  sectionType: string;
  displayOrder: number;
  isPublished: boolean;
  version: number;
  /** Names a fixed part of the home page ('hero', 'trust', …); null for other sections. */
  key: string | null;
}

export interface IPageDetail {
  id: number;
  slug: string;
  name: string;
  hasFixedLayout: boolean;
  eyebrow: string | null;
  heading: string;
  introduction: string;
  version: number;
  sections: ISectionListItem[];
}

export interface IPrimaryImage {
  mediaId: number;
  url: string;
  altText: string | null;
}

export interface IGalleryImage {
  id: number;
  mediaId: number;
  url: string;
  altText: string | null;
  position: number;
}

export interface ISectionContent {
  id: number;
  pageId: number;
  title: string;
  eyebrow: string | null;
  introduction: string | null;
  description: string;
  additionalDescription: string | null;
  details: string[];
  sectionType: string;
  sectionTypeName: string;
  hasPrimaryImage: boolean;
  hasGallery: boolean;
  displayOrder: number;
  isPublished: boolean;
  version: number;
  primaryImage: IPrimaryImage | null;
  gallery: IGalleryImage[];
  key: string | null;
  /** The points with their text and icon (cards on the home page). `details` holds just their texts. */
  items: ISectionItem[];
}

export interface ISectionItem {
  text: string;
  description: string | null;
  icon: string | null;
}

/** Everything saved for one part of the home page. */
export interface IHomePartSave {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  items: ISectionItem[];
  primaryMediaId: number | null;
}

export interface IMedia {
  id: number;
  url: string;
  name: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
}

/** An image in the image library (Billedarkiv). */
export interface IMediaItem extends IMedia {
  createdUtc: string;
  defaultAltText: string | null;
  usageCount: number;
}

export interface IMediaPage {
  items: IMediaItem[];
  total: number;
}

/**
 * Where an image is shown on the website. `kind` is the section's primary image, a gallery position, or a position in a
 * project; for projects `projectId` is set and `sectionTitle` is the project's title.
 */
export interface IMediaUsage {
  pageId: number;
  pageName: string;
  sectionId: number;
  sectionTitle: string;
  sectionType: string;
  kind: 'Primary' | 'Gallery' | 'Project';
  position: number | null;
  projectId: number | null;
}

export interface IMediaDetail extends IMedia {
  createdUtc: string;
  defaultAltText: string | null;
  usages: IMediaUsage[];
}

export type MediaFilter = 'all' | 'used' | 'unused';
export type MediaSort = 'newest' | 'oldest' | 'name';

export interface IMediaQuery {
  search: string;
  filter: MediaFilter;
  sort: MediaSort;
  skip: number;
  take: number;
}

export interface IGalleryImageInput {
  mediaId: number;
  altText: string | null;
}

/** Section types an administrator can create; mirror the SectionType lookup table seeded by the backend. The "Profile" type only exists on the fixed "Om os" page. */
/** Which images a section shows; it decides how the section is laid out on the page. Numbers match the API. */
export enum SectionMedia { None = 0, Images = 1, BeforeAfter = 2 }

export interface ISectionContentSave {
  title: string;
  eyebrow: string | null;
  introduction: string | null;
  description: string | null;
  additionalDescription: string | null;
  details: string[];
  media: SectionMedia;
  primaryMediaId: number | null;
  galleryMediaIds: number[];
}

export interface IProjectListItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  location: string;
  /** yyyy-mm-dd */
  completedOn: string;
  isFeatured: boolean;
  isPublished: boolean;
  coverUrl: string | null;
  imageCount: number;
}

export interface IProjectImage {
  mediaId: number;
  url: string;
  name: string;
}

export interface IProjectDetail {
  id: number;
  slug: string;
  title: string;
  category: string;
  location: string;
  completedOn: string;
  summary: string;
  description: string;
  isFeatured: boolean;
  isPublished: boolean;
  version: number;
  images: IProjectImage[];
}

/** What the project editor saves in one go. */
export interface IProjectInput {
  title: string;
  category: string;
  location: string;
  completedOn: string;
  summary: string;
  description: string;
  isFeatured: boolean;
  isPublished: boolean;
  mediaIds: number[];
}

/** The Projekter page shows three projects at the top; the server allows at most this many to be featured. */
export const MAX_FEATURED_PROJECTS = 3;

export const ALLOWED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Structured error shown to the administrator. `fields` maps API field names to messages. */
export interface IApiError {
  status: number;
  message: string;
  fields: Record<string, string[]>;
}

/** Message shown in the status area after an action. */
export interface INotice {
  kind: 'success' | 'error';
  text: string;
}

/** Looks up server-side validation messages for a field (the API uses PascalCase names). */
export function fieldMessages(fields: Record<string, string[]>, name: string): string[] {
  const wanted = name.toLowerCase();
  return Object.entries(fields)
    .filter(([key]) => key.toLowerCase() === wanted)
    .flatMap(([, messages]) => messages);
}
