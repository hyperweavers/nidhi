import { Route } from '@angular/router';

import { Constants } from './constants';

export const appRoutes: Route[] = [
  { path: '', redirectTo: `/${Constants.routes.HOME}`, pathMatch: 'full' },
  {
    path: Constants.routes.HOME,
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: Constants.routes.LOAN_EMI,
    loadComponent: () =>
      import('./pages/loan-emi-calculator/loan-emi-calculator.page').then((m) => m.LoanEmiCalculatorPage),
  },
  {
    path: Constants.routes.SETTINGS,
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
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
    path: Constants.routes.DISCLAIMER,
    loadComponent: () =>
      import('./pages/disclaimer/disclaimer.page').then(
        (m) => m.DisclaimerPage,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/page-not-found/page-not-found.page').then(
        (m) => m.PageNotFoundPage,
      ),
  },
];
