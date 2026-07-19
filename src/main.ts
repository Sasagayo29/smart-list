import 'zone.js'; // O motor do Angular volta triunfante e definitivo!

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Como não temos mais SSR, a câmera pode ser carregada direto!
    import('@ionic/pwa-elements/loader').then(module => {
      module.defineCustomElements(window);
    });
  })
  .catch((err) => console.error(err));