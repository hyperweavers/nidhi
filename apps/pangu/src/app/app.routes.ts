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
    path: Constants.routes.TRANSACTION,
    loadComponent: () =>
      import('./pages/transaction/transaction.page').then(
        (m) => m.TransactionPage
      ),
  },
  {
    path: Constants.routes.ABOUT,
    loadComponent: () =>
      import('./pages/about/about.page').then((m) => m.AboutPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/page-not-found/page-not-found.page').then(
        (m) => m.PageNotFoundPage
      ),
  },
];
