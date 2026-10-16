import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faCheck, faPhone} from '@fortawesome/free-solid-svg-icons';
import {ContactConstants} from '../../core/constants/contact.constants';

interface IServiceItem {
  id: string;
  title: string;
  description: string;
  points: string[];
  image: string;
}

@Component({
  selector: 'mvo-services',
  imports: [RouterLink, FaIconComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  standalone: true,
})
export class ServicesComponent {
  protected readonly callHref = `tel:+45${ContactConstants.PHONE_NUMBER.replace(/\s/g, '')}`;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faCheck = faCheck;
  protected readonly faPhone = faPhone;

  protected readonly services: IServiceItem[] = [
    {
      id: 'badevaerelser', title: 'Badeværelser', image: 'bathrooms/bathroom1.png',
      description: 'Vores speciale. Vi renoverer hele badeværelset fra rå væg til færdigt rum, så du kun har én håndværker at holde styr på.',
      points: ['Nedrivning og opbygning af vægge og gulv', 'Vådrumssikring med membran efter gældende regler', 'Gulv med korrekt fald mod afløb'],
    },
    {
      id: 'fliser', title: 'Fliser og klinker', image: 'tile-work/image4.png',
      description: 'Fliser på gulv og væg i bad, køkken, bryggers og entré, lagt med lige fuger og sans for detaljen.',
      points: ['Store formater, mosaik og mønstre', 'Fliser bag køkkenbordet', 'Udskiftning af revnede fliser og omfugning'],
    },
    {
      id: 'reparationer', title: 'Murerreparationer', image: 'reparations/reparation0.jpeg',
      description: 'Revner, skader og nedslidt murværk bliver udbedret, så det ser pænt ud og holder igen.',
      points: ['Revner i vægge, lofter og sokkel', 'Udskiftning af ødelagte sten', 'Reparation af puds inde og ude'],
    },
    {
      id: 'facade', title: 'Facade og puds', image: 'tile-work/image9.jpeg',
      description: 'En facade i god stand beskytter huset. Vi pudser, filtser og fuger, så huset står flot i mange år.',
      points: ['Pudsning og filtsning af facader', 'Omfugning af murværk', 'Sokkelpuds og reparation af sokkel'],
    },
    {
      id: 'gulve', title: 'Gulve og afretning', image: 'tile-work/image2.jpeg',
      description: 'Et plant og stærkt undergulv er grundlaget for et godt resultat, uanset om der skal fliser, klinker eller trægulv ovenpå.',
      points: ['Støbning af betongulve', 'Afretning før nyt gulv', 'Forberedelse til gulvvarme'],
    },
    {
      id: 'forsikringssager', title: 'Forsikringssager', image: 'bathrooms/bathroom6.png',
      description: 'Har du haft en vand-, frost- eller rørskade, hjælper vi med at udbedre den og taler gerne med dit forsikringsselskab.',
      points: ['Gennemgang og vurdering af skaden', 'Billeder og beskrivelse til forsikringen', 'Genopbygning til samme stand som før'],
    },
    {
      id: 'mindre-opgaver', title: 'Mindre mureropgaver', image: 'minor-solutions/solution0.png',
      description: 'Intet er for lille. Vi tager også de små opgaver i hjem og erhverv, som ofte bliver skubbet foran sig.',
      points: ['Huller og gennembrydninger i vægge', 'Lukning af døre og vinduesåbninger', 'Opmuring af mindre vægge'],
    },
  ];
}
