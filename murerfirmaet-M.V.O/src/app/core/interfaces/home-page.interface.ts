import {IconProp} from '@fortawesome/fontawesome-svg-core';

/** A card on the home page: a trust highlight, a feature or a work step. */
export interface IHomeCard {
  /** One of the names in HOME_ICONS. */
  icon: string;
  title: string;
  text: string;
}

export interface IHomeHeading {
  eyebrow?: string;
  heading: string;
}

/** Everything on the home page the masons edit from the admin page. The quote form and buttons are fixed. */
export interface IHomeContent {
  hero: IHomeHeading & {text: string; points: string[]; imageUrl: string};
  trust: IHomeCard[];
  services: IHomeHeading;
  features: IHomeCard[];
  steps: IHomeHeading & {cards: IHomeCard[]};
  projects: IHomeHeading;
}

export type HomePartKey = keyof IHomeContent;

/** The parts in page order, with the names the admin page uses for them. */
export const HOME_PARTS: {key: HomePartKey; label: string; hint: string}[] = [
  {key: 'hero', label: 'Toppen', hint: 'Overskrift, tekst og billede'},
  {key: 'trust', label: 'Tillidsfelter', hint: 'De fire felter under toppen'},
  {key: 'services', label: 'Vores ydelser', hint: 'Overskrift over ydelserne'},
  {key: 'features', label: 'Fordele', hint: 'De fire fordele'},
  {key: 'steps', label: 'Sådan arbejder vi', hint: 'De fire trin'},
  {key: 'projects', label: 'Seneste projekter', hint: 'Overskrift over projekterne'},
];

/** The icons a card can have, by the name the API stores. The backend accepts the same names (HomePage.Icons). */
export const HOME_ICONS: Record<string, IconProp> = {
  'shield': ['fas', 'shield'],
  'check': ['fas', 'check'],
  'user': ['fas', 'user'],
  'location-dot': ['fas', 'location-dot'],
  'face-smile': ['far', 'face-smile'],
  'message': ['far', 'message'],
  'file-lines': ['far', 'file-lines'],
  'phone': ['fas', 'phone'],
  'hammer': ['fas', 'hammer'],
  'circle-check': ['fas', 'circle-check'],
  'star': ['far', 'star'],
  'clock': ['far', 'clock'],
  'house': ['fas', 'house'],
  'handshake': ['far', 'handshake'],
  'award': ['fas', 'award'],
  'trowel': ['fas', 'trowel'],
};

export const homeIcon = (name: string): IconProp => HOME_ICONS[name] ?? HOME_ICONS['check'];

/** Shown until a background photo is picked from the image library, and when the API cannot be reached. */
export const HOME_FALLBACK_IMAGE = '/hero-mvo.jpg';

/** Images in the project carousel while there are no projects yet. */
export const HOME_FALLBACK_PROJECT_IMAGES: string[] = [
  'bathrooms/bathroom1.png', 'bathrooms/bathroom2.png', 'bathrooms/bathroom3.png', 'bathrooms/bathroom4.png',
  'bathrooms/bathroom5.png', 'tile-work/image0.png', 'tile-work/image1.jpeg', 'tile-work/image2.jpeg',
  'tile-work/image3.jpeg', 'tile-work/image4.png', 'tile-work/image5.jpeg', 'tile-work/image7.jpeg',
  'tile-work/image8.jpeg', 'tile-work/image9.jpeg', 'personality/personality0.png', 'reparations/reparation0.jpeg',
  'minor-solutions/solution0.png',
];

/** Shown when the API cannot be reached. Matches the content the database starts with. */
export const HOME_FALLBACK: IHomeContent = {
  hero: {
    eyebrow: 'Kvalitet • Tillid • Holdbare løsninger',
    heading: 'Din murer i København',
    text: 'Badeværelser, flisearbejde og reparationer udført med kvalitet ned til detaljen',
    points: ['Speciale i badeværelser', 'Kvalitet ned til detaljen', 'Klar kommunikation', 'Personlig rådgivning'],
    imageUrl: HOME_FALLBACK_IMAGE,
  },
  trust: [
    {icon: 'shield', title: '15+ års erfaring', text: 'Solidt håndværk og mange tilfredse kunder'},
    {icon: 'check', title: 'Gratis og uforpligtende', text: 'Få et tilbud helt gratis – uden bindinger'},
    {icon: 'user', title: 'Fast kontaktperson', text: 'Du har den samme kontakt fra tilbud til aflevering'},
    {icon: 'location-dot', title: 'København & omegn', text: 'Vi hjælper hele København og Nordsjælland'},
  ],
  services: {eyebrow: 'Vores ydelser', heading: 'Vi løser dine mureropgaver'},
  features: [
    {icon: 'face-smile', title: '100% tilfredshed', text: 'Vi går aldrig, før du er fuldt tilfreds.'},
    {icon: 'message', title: 'Klar kommunikation', text: 'Du får løbende besked og fuldt overblik.'},
    {icon: 'file-lines', title: 'Gennemsigtige aftaler', text: 'Ingen skjulte omkostninger – kun klare aftaler.'},
    {icon: 'shield', title: 'Forsikringssager', text: 'Vi hjælper med reparationer efter skader.'},
  ],
  steps: {
    eyebrow: 'Sådan arbejder vi',
    heading: 'En tryg proces fra start til slut',
    cards: [
      {icon: 'phone', title: 'Kontakt os', text: 'Fortæl os om din opgave via formularen eller ring til os.'},
      {icon: 'file-lines', title: 'Vi giver dig et tilbud', text: 'Du modtager et gratis og uforpligtende tilbud.'},
      {icon: 'hammer', title: 'Vi udfører opgaven', text: 'Vi går i gang til aftalt tid og leverer håndværk i højeste kvalitet.'},
      {icon: 'circle-check', title: 'Levering & opfølgning', text: 'Vi gennemgår arbejdet sammen med dig og sikrer, at alt er, som det skal være.'},
    ],
  },
  projects: {eyebrow: 'Seneste projekter', heading: 'Se et udvalg af vores arbejde'},
};

/** A home page section as both the public and the admin API send it. */
export interface IHomeSectionData {
  key: string | null;
  title: string;
  eyebrow: string | null;
  description: string;
  items: {text: string; description: string | null; icon: string | null}[];
  /** Already a full URL. */
  imageUrl: string | null;
}

/** Builds the home page from its sections. A part that is missing (or hidden) keeps the fallback content. */
export function toHomeContent(sections: IHomeSectionData[]): IHomeContent {
  const content = structuredClone(HOME_FALLBACK);
  const cards = (s: IHomeSectionData): IHomeCard[] =>
    s.items.map(i => ({icon: i.icon ?? 'check', title: i.text, text: i.description ?? ''}));
  const heading = (s: IHomeSectionData): IHomeHeading => ({eyebrow: s.eyebrow ?? undefined, heading: s.title});

  for (const s of sections) {
    switch (s.key) {
      case 'hero':
        content.hero = {...heading(s), text: s.description, points: s.items.map(i => i.text), imageUrl: s.imageUrl ?? HOME_FALLBACK_IMAGE};
        break;
      case 'trust': content.trust = cards(s); break;
      case 'services': content.services = heading(s); break;
      case 'features': content.features = cards(s); break;
      case 'steps': content.steps = {...heading(s), cards: cards(s)}; break;
      case 'projects': content.projects = heading(s); break;
    }
  }
  return content;
}
