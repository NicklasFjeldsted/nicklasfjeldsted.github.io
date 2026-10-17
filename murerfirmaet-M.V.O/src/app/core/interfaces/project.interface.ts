import {QuoteCategory} from '../constants/quote-categories.constants';
import {IMasonryImage} from './masonry-page.interface';

/** A finished job the masons document on the Projekter page. */
export interface IProject {
  id: string;
  slug: string;
  title: string;
  /** Same categories as the quote form, so a customer can find jobs like their own. */
  category: QuoteCategory;
  location: string;
  /** When the job was finished, shown as month and year. ISO date (yyyy-mm-dd). */
  completedOn: string;
  /** Short text for the section and the popup. */
  summary: string;
  /** The full description on the project page, one entry per paragraph. */
  description: string[];
  /** The first image is the cover. */
  images: IMasonryImage[];
  /** Featured projects get their own section at the top of the page. */
  featured: boolean;
}
