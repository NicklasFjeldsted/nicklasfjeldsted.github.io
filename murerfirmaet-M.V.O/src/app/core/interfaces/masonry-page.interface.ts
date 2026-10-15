export interface IMasonryImage {
  id: string;
  url: string;
  alt: string;
}

export type MasonrySectionType = 'MasonryShowcase' | 'TextBlock' | 'BeforeAfter';

export interface IMasonrySection {
  id: string;
  /** Which layout the section uses. Missing means the default showcase. */
  type?: MasonrySectionType;
  title: string;
  eyebrow?: string;
  introduction?: string;
  description: string;
  additionalDescription?: string;
  details: string[];
  primaryImage?: IMasonryImage;
  gallery: IMasonryImage[];
  displayOrder: number;
  published: boolean;
}

export interface ISpecializedMasonryPage {
  eyebrow?: string;
  heading: string;
  introduction: string;
  image?: IMasonryImage;
  sections: IMasonrySection[];
}
