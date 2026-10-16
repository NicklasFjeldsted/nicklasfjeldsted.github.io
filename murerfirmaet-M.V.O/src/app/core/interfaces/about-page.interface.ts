/** Content of the "Om os" hero: the page text plus the mason's profile. */
export interface IAboutProfile {
  eyebrow?: string;
  heading: string;
  introduction: string;
  name: string;
  role?: string;
  /** The story, one entry per paragraph. */
  story: string[];
  imageUrl: string;
}

/** Shown until a photo is picked from the image library, and when the API cannot be reached. */
export const ABOUT_FALLBACK_IMAGE = 'about/murer.jpg';

/** Paragraphs are separated by an empty line in the admin text field. */
export const toParagraphs = (text: string): string[] =>
  text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
