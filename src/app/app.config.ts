import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { NgxSpinnerModule } from 'ngx-spinner';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
    importProvidersFrom(NgxSpinnerModule.forRoot({ type: 'ball-clip-rotate' }))
  ]
};
