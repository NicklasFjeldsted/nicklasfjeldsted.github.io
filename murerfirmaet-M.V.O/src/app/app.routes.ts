import {Routes} from '@angular/router';
import {HomeComponent} from './views/home/home.component';
import {SpecializedMasonryComponent} from './views/specialized-masonry/specialized-masonry.component';
import {authGuard, unsavedChangesGuard} from './admin/admin.guards';

export const routes: Routes = [
  {
    path: 'specialiseret-murerarbejde',
    component: SpecializedMasonryComponent,
    data: {headerTheme: 'light'}
  },
  {path: 'admin/login', loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent)},
  {
    path: 'admin',
    loadComponent: () => import('./admin/content/admin-content.component').then(m => m.AdminContentComponent),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: '**',
    component: HomeComponent
  }
];
