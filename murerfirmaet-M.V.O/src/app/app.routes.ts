import {Routes} from '@angular/router';
import {HomeComponent} from './views/home/home.component';
import {SpecializedMasonryComponent} from './views/specialized-masonry/specialized-masonry.component';

export const routes: Routes = [
  {
    path: 'specialiseret-murerarbejde',
    component: SpecializedMasonryComponent
  },
  {
    path: '**',
    component: HomeComponent
  }
];
