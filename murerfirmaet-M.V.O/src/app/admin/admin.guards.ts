import {CanActivateFn, CanDeactivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/admin/login']);
};

export interface IHasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  confirmDiscard(): Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<IHasUnsavedChanges> = component =>
  component.hasUnsavedChanges() ? component.confirmDiscard() : true;
