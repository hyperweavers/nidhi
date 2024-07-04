import { Route } from '@angular/router';

import { Constants } from './constants';

export const appRoutes: Route[] = [
  { path: '', redirectTo: `/${Constants.routes.DASHBOARD}`, pathMatch: 'full' },
  {
    path: Constants.routes.DASHBOARD,
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: Constants.routes.PORTFOLIO,
    loadComponent: () =>
      import('./pages/portfolio/portfolio.page').then((m) => m.PortfolioPage),
  },
  {
    path: Constants.routes.STOCKS,
    loadComponent: () =>
      import('./pages/stocks/stocks.page').then((m) => m.StocksPage),
  },
  {
    path: `${Constants.routes.STOCKS}/:id`,
    loadComponent: () =>
      import('./pages/stocks/stocks.page').then((m) => m.StocksPage),
  },
  {
    path: Constants.routes.SETTINGS,
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: Constants.routes.IMPORT,
    loadComponent: () =>
      import('./pages/import/import.page').then((m) => m.ImportPage),
  },
  {
    path: Constants.routes.EXPORT,
    loadComponent: () =>
      import('./pages/export/export.page').then((m) => m.ExportPage),
  },
  {
    path: Constants.routes.DELETE,
    loadComponent: () =>
      import('./pages/delete/delete.page').then((m) => m.DeletePage),
  },
  {
    path: Constants.routes.ABOUT,
    loadComponent: () =>
      import('./pages/about/about.page').then((m) => m.AboutPage),
  },
  {
    path: Constants.routes.PRIVACY,
    loadComponent: () =>
      import('./pages/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: Constants.routes.TERMS,
    loadComponent: () =>
      import('./pages/terms/terms.page').then((m) => m.TermsPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/page-not-found/page-not-found.page').then(
        (m) => m.PageNotFoundPage
      ),
  },
];
