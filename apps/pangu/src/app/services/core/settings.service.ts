import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Constants } from '../../constants';
import { RefreshInterval, Settings, Theme } from '../../models/settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly DEFAULT_SETTINGS: Settings = {
    theme: Theme.SYSTEM,
    refreshInterval: RefreshInterval.THIRTY_SECONDS,
  };

  public settings$: BehaviorSubject<Settings>;

  constructor() {
    const theme = this.getTheme();
    const refreshInterval = this.getRefreshInterval();

    this.settings$ = new BehaviorSubject<Settings>({
      theme,
      refreshInterval,
    });

    this.applyTheme(theme);
  }

  public setTheme(theme: Theme): void {
    if (theme && Object.values<string>(Theme).includes(theme) && localStorage) {
      localStorage.setItem(Constants.settings.THEME, theme);

      this.applyTheme(theme);

      this.settings$.next({
        theme,
        refreshInterval: this.getRefreshInterval(),
      });
    }
  }

  public setRefreshInterval(refreshInterval: RefreshInterval): void {
    if (
      refreshInterval &&
      !isNaN(Number(refreshInterval)) &&
      refreshInterval in RefreshInterval &&
      localStorage
    ) {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(refreshInterval),
      );

      this.settings$.next({
        refreshInterval,
        theme: this.getTheme(),
      });
    }
  }

  private getTheme(): Theme {
    return (
      localStorage &&
      ((localStorage.getItem(Constants.settings.THEME) ||
        this.DEFAULT_SETTINGS.theme) as Theme)
    );
  }

  private getRefreshInterval(): RefreshInterval {
    return (
      localStorage &&
      ((Number(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)) ||
        this.DEFAULT_SETTINGS.refreshInterval) as RefreshInterval)
    );
  }

  private applyTheme(theme: Theme): void {
    const documentElementClassList = document.documentElement.classList;

    let isDarkTheme = false;

    if (
      (theme === Theme.SYSTEM &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      theme === Theme.DARK
    ) {
      isDarkTheme = true;
    }

    if (isDarkTheme) {
      !documentElementClassList.contains('dark') &&
        documentElementClassList.add('dark');
    } else {
      documentElementClassList.contains('dark') &&
        documentElementClassList.remove('dark');
    }
  }
}
