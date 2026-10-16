import {Routes} from '@angular/router';
import {HomeComponent} from './views/home/home.component';
import {SpecializedMasonryComponent} from './views/specialized-masonry/specialized-masonry.component';
import {ContactComponent} from './views/contact/contact.component';
import {AboutComponent} from './views/about/about.component';
import {ServicesComponent} from './views/services/services.component';
import {authGuard, unsavedChangesGuard} from './admin/admin.guards';

export const routes: Routes = [
  {
    path: 'specialiseret-murerarbejde',
    component: SpecializedMasonryComponent,
    data: {headerTheme: 'light'}
  },
  {path: 'ydelser', component: ServicesComponent},
  {path: 'om-os', component: AboutComponent},
  {path: 'kontakt', component: ContactComponent},
  {path: 'admin/login', loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent)},
  {
    path: 'admin',
    loadComponent: () => import('./admin/shell/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./admin/content/admin-content.component').then(m => m.AdminContentComponent),
        canDeactivate: [unsavedChangesGuard],
        runGuardsAndResolvers: 'pathParamsChange',
      },
      {
        path: 'billeder',
        loadComponent: () => import('./admin/media/media-library.component').then(m => m.MediaLibraryComponent),
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
  {
    path: '**',
    component: HomeComponent
  }
];
