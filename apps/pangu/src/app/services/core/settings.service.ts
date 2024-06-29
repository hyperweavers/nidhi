import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Constants } from '../../constants';
import { Settings, Theme } from '../../models/settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly DEFAULT_SETTINGS: Settings = {
    theme: Theme.SYSTEM,
  };

  public settings$: BehaviorSubject<Settings>;

  constructor() {
    const theme = this.getTheme();

    this.settings$ = new BehaviorSubject<Settings>({
      theme,
    });

    this.applyTheme(theme);
  }

  public setTheme(theme: Theme): void {
    if (theme && Object.values<string>(Theme).includes(theme) && localStorage) {
      localStorage.setItem(Constants.settings.THEME, theme);

      this.applyTheme(theme);

      this.settings$.next({
        theme,
      });
    }
  }

  private getTheme(): Theme {
    return localStorage && (localStorage.getItem(Constants.settings.THEME) || this.DEFAULT_SETTINGS.theme) as Theme;
  }

  private applyTheme(theme: Theme): void {
    const documentElementClassList = document.documentElement.classList;

    let isDarkTheme = false;

    if ((theme === Theme.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === Theme.DARK) {
      isDarkTheme = true;
    }

    if (isDarkTheme) {
      !documentElementClassList.contains('dark') && documentElementClassList.add('dark');
    } else {
      documentElementClassList.contains('dark') && documentElementClassList.remove('dark');
    }
  }
}
