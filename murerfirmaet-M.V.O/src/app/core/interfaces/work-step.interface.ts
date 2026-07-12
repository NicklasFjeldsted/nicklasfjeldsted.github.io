import {IconProp} from '@fortawesome/fontawesome-svg-core';

export interface IWorkStep {
  index: number;
  titleKey: string;
  descriptionKey: string;
  icon: IconProp;
}
