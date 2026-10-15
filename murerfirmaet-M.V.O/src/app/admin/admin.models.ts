export interface IPageListItem {
  id: number;
  slug: string;
  name: string;
  isManaged: boolean;
  sectionCount: number;
}

export interface ISectionListItem {
  id: number;
  title: string;
  sectionType: string;
  displayOrder: number;
  isPublished: boolean;
  version: number;
}

export interface IPageDetail {
  id: number;
  slug: string;
  name: string;
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
}

export interface IMedia {
  id: number;
  url: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface IGalleryImageInput {
  mediaId: number;
  altText: string | null;
}

/** Values mirror the SectionType lookup table seeded by the backend. */
export const SECTION_TYPES = [
  {id: 1, label: 'Murerarbejde med billeder'},
  {id: 2, label: 'Tekstblok'},
  {id: 3, label: 'Før og efter (billedsammenligning)'},
] as const;

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
