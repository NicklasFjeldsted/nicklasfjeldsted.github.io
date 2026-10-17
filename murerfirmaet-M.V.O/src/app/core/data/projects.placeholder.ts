import {IMasonryImage} from '../interfaces/masonry-page.interface';
import {IProject} from '../interfaces/project.interface';

const image = (id: string, url: string): IMasonryImage => ({id, url, alt: ''});

/** Example projects for the layout proposal. Replaced by projects the masons create in the admin. */
export const PROJECTS_PLACEHOLDER: IProject[] = [
  {
    id: 'p1',
    slug: 'marmorbadevaerelse-valby',
    title: 'Badeværelse med marmorfliser og nicher',
    category: 'bathroom',
    location: 'Valby',
    completedOn: '2026-08-20',
    summary:
      'Totalrenovering af et ældre badeværelse. Vi fjernede alt ned til råhus, lagde nyt vådrumsmembran og satte store marmorlignende fliser fra gulv til loft med to indbyggede nicher i bruseren.',
    description: [
      'Kunden havde et slidt badeværelse fra 80\'erne med utætte fuger og et gulv uden ordentligt fald. Ønsket var et roligt, lyst rum med så få fuger som muligt og plads til shampoo og sæbe uden hylder på væggen.',
      'Vi brød det gamle bad ned, rettede gulvet op med nyt fald mod en linjeafløb og lagde vådrumsmembran efter BYG-ERFA\'s anvisninger. Væggene fik store fliser i 60 x 120 cm, og vi murede to nicher ind i bruservæggen, så de flugter med fliserne.',
      'Hele opgaven tog tre uger fra nedrivning til færdigt rum, og kunden kunne bruge toilettet i gæstebadet undervejs.',
    ],
    images: [
      image('p1-1', 'bathrooms/bathroom4.png'),
      image('p1-2', 'bathrooms/bathroom5.png'),
      image('p1-3', 'bathrooms/bathroom3.png'),
      image('p1-4', 'bathrooms/bathroom2.png'),
      image('p1-5', 'minor-solutions/solution0.png'),
    ],
    featured: true,
  },
  {
    id: 'p2',
    slug: 'badevaerelse-med-badekar-frederiksberg',
    title: 'Badeværelse med fritstående badekar',
    category: 'bathroom',
    location: 'Frederiksberg',
    completedOn: '2026-06-12',
    summary:
      'Nyt badeværelse i en lejlighed med fritstående badekar, walk-in brusenische med sort glasvæg og ternet klinkegulv i gangen ud til badet.',
    description: [
      'Lejligheden skulle have et badeværelse med plads til både badekar og bruser. Vi flyttede afløbet, så badekarret kunne stå frit under vinduet, og byggede en brusenische med glasvæg i den anden ende af rummet.',
      'Gulvet i gangen fik et klassisk ternet klinkegulv, som binder den gamle lejlighed sammen med det nye bad.',
    ],
    images: [
      image('p2-1', 'bathrooms/bathroom6.png'),
      image('p2-2', 'bathrooms/bathroom7.png'),
      image('p2-3', 'bathrooms/bathroom1.png'),
    ],
    featured: true,
  },
  {
    id: 'p3',
    slug: 'udvendig-trappe-hvidovre',
    title: 'Renovering af udvendig betontrappe',
    category: 'repair',
    location: 'Hvidovre',
    completedOn: '2026-05-03',
    summary:
      'En forvitret trappe til hoveddøren fik nye trin, ny forkant og en slidstærk overflade, så den kan klare frost og salt mange år frem.',
    description: [
      'Trappen havde store afskalninger, og frosten var begyndt at sprænge forkanterne af. Vi huggede de løse dele væk, armerede trinene op igen og støbte nye forkanter.',
      'Til sidst fik trappen en ny overflade, der er skridsikker og tåler vejsalt. Gelænderet blev siddende under hele arbejdet.',
    ],
    images: [image('p3-1', 'reparations/reparation0.jpeg')],
    featured: true,
  },
  {
    id: 'p4',
    slug: 'gulvfliser-broenshoej',
    title: 'Store gulvfliser i stueetagen',
    category: 'tiles',
    location: 'Brønshøj',
    completedOn: '2026-03-18',
    summary: 'Ca. 60 m² gulvfliser i stort format lagt med nivelleringssystem, så gulvet står helt plant over hele stueetagen.',
    description: [
      'Stueetagen skulle have ét sammenhængende gulv fra entré til køkken. Vi rettede undergulvet op og lagde fliserne med et nivelleringssystem, så der ikke er kanter mellem fliserne.',
    ],
    images: [
      image('p4-1', 'tile-work/image1.jpeg'),
      image('p4-2', 'tile-work/image0.png'),
      image('p4-3', 'tile-work/image9.jpeg'),
    ],
    featured: false,
  },
  {
    id: 'p5',
    slug: 'vaegfliser-amager',
    title: 'Vægfliser i stort format',
    category: 'tiles',
    location: 'Amager',
    completedOn: '2026-01-22',
    summary: 'Lyse vægfliser i stort format i et badeværelse under skrå loft, med præcise skæringer omkring vindue og karm.',
    description: [
      'Rummet har skrå vægge og et lavt vindue, så hver flise skulle skæres til. Vi planlagde fugerne, så de går lige igennem omkring vinduet.',
    ],
    images: [
      image('p5-1', 'tile-work/image7.jpeg'),
      image('p5-2', 'tile-work/image2.jpeg'),
      image('p5-3', 'tile-work/image3.jpeg'),
      image('p5-4', 'tile-work/image5.jpeg'),
    ],
    featured: false,
  },
  {
    id: 'p6',
    slug: 'altan-med-klinker',
    title: 'Altan med teglklinker',
    category: 'masonry',
    location: 'Rødovre',
    completedOn: '2025-09-30',
    summary: 'Altanen fik nyt fald, ny membran og gule teglklinker lagt i forbandt, som passer til husets mursten.',
    description: [
      'Vandet blev stående på den gamle altan. Vi lagde et nyt lag med fald ud mod kanten, en membran ovenpå og afsluttede med teglklinker i samme farve som facaden.',
    ],
    images: [image('p6-1', 'tile-work/image8.jpeg'), image('p6-2', 'tile-work/image4.png')],
    featured: false,
  },
];
