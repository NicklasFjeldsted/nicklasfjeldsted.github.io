import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './admin/auth.interceptor';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { FaIconRegistryService } from './core/services/fa-icon-registry.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions(), withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({ lang: 'da' }),
    provideTranslateHttpLoader({ resources: [{ prefix: './i18n/', suffix: '.json' }] }),
    {
      provide: APP_INITIALIZER,
      useFactory: (fa: FaIconRegistryService) => () => fa.register(),
      deps: [FaIconRegistryService],
      multi: true,
    },
  ]
};
