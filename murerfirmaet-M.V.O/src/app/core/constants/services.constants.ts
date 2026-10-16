/** Services on the "Ydelser" page, in display order. The id is the page anchor; texts live in i18n under servicesPage.items.<id>. */
export const SERVICES = [
  {id: 'badevaerelser', image: 'bathrooms/bathroom1.png'},
  {id: 'fliser', image: 'tile-work/image4.png'},
  {id: 'reparationer', image: 'reparations/reparation0.jpeg'},
  {id: 'facade', image: 'tile-work/image9.jpeg'},
  {id: 'gulve', image: 'tile-work/image2.jpeg'},
  {id: 'forsikringssager', image: 'bathrooms/bathroom6.png'},
  {id: 'mindre-opgaver', image: 'minor-solutions/solution0.png'},
] as const;

export type ServiceId = typeof SERVICES[number]['id'];
