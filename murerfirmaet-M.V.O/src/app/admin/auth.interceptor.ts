import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {API_BASE_URL} from '../core/config/api.config';
import {AuthService} from './auth.service';

/** Adds the bearer token to API calls and signs the administrator out when it is rejected. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_BASE_URL}/api/admin`)) return next(req);

  const auth = inject(AuthService);
  const token = auth.token();
  const authorised = token ? req.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : req;

  return next(authorised).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
      return throwError(() => error);
    }),
  );
};
