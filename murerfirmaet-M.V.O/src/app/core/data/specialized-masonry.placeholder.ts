import {IMasonryImage, ISpecializedMasonryPage} from '../interfaces/masonry-page.interface';

const placeholderImage = (id: string, url: string): IMasonryImage => ({
  id,
  url,
  alt: 'Pladsholderbillede - erstattes af kundens egne billeder',
});

export const SPECIALIZED_MASONRY_PLACEHOLDER: ISpecializedMasonryPage = {
  eyebrow: 'Specialiseret murerarbejde',
  heading: 'Pladsholder: Overskrift til siden',
  introduction:
    'Pladsholdertekst. Her beskriver murerne kort, hvilke krævende opgaver de påtager sig, og hvad der kendetegner deres håndværk. Teksten erstattes via administrationen.',
  sections: [
    {
      id: 'placeholder-1',
      eyebrow: 'Kategori 1',
      title: 'Pladsholder: Første kategori',
      introduction: 'Kort pladsholderintroduktion til kategorien.',
      description:
        'Pladsholdertekst. Her forklares opgavens karakter, hvad der gør den krævende, og hvilke hensyn der indgår i udførelsen. Teksten erstattes af murernes egen beskrivelse.',
      additionalDescription:
        'Yderligere pladsholdertekst, som kan udelades, hvis kategorien ikke har brug for den.',
      details: ['Pladsholder for tekniske hensyn', 'Pladsholder for krav til projektet'],
      primaryImage: placeholderImage('p1-main', 'tile-work/image1.jpeg'),
      gallery: [
        placeholderImage('p1-main', 'tile-work/image1.jpeg'),
        placeholderImage('p1-g2', 'tile-work/image2.jpeg'),
        placeholderImage('p1-g3', 'tile-work/image3.jpeg'),
      ],
      displayOrder: 1,
      published: true,
    },
    {
      id: 'placeholder-2',
      eyebrow: 'Kategori 2',
      title: 'Pladsholder: Anden kategori',
      description:
        'Pladsholdertekst uden ekstra afsnit eller punktliste, så layoutet kan ses med mindre indhold.',
      details: [],
      primaryImage: placeholderImage('p2-main', 'tile-work/image5.jpeg'),
      gallery: [
        placeholderImage('p2-main', 'tile-work/image5.jpeg'),
        placeholderImage('p2-g2', 'tile-work/image7.jpeg'),
        placeholderImage('p2-g3', 'tile-work/image8.jpeg'),
        placeholderImage('p2-g4', 'tile-work/image9.jpeg'),
      ],
      displayOrder: 2,
      published: true,
    },
    {
      id: 'placeholder-3',
      eyebrow: 'Kategori 3',
      title: 'Pladsholder: Tredje kategori',
      introduction: 'Kort pladsholderintroduktion.',
      description:
        'Pladsholdertekst. Denne kategori har kun to galleribilleder for at vise, at layoutet tåler forskelligt antal billeder.',
      details: ['Pladsholder for erfaring'],
      primaryImage: placeholderImage('p3-main', 'bathrooms/bathroom1.png'),
      gallery: [
        placeholderImage('p3-main', 'bathrooms/bathroom1.png'),
        placeholderImage('p3-g2', 'bathrooms/bathroom2.png'),
      ],
      displayOrder: 3,
      published: true,
    },
  ],
};
