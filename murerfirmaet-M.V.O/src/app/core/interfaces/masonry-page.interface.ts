export interface IMasonryImage {
  id: string;
  url: string;
  alt: string;
}

export interface IMasonrySection {
  id: string;
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
