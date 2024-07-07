import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Constants } from '../../constants';
import {
  ColorScheme,
  RefreshInterval,
  Settings,
  Theme,
} from '../../models/settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly DEFAULT_SETTINGS: Settings = {
    theme: Theme.SYSTEM,
    colorScheme: ColorScheme.DARK,
    refreshInterval: RefreshInterval.THIRTY_SECONDS,
  };

  public settings$: Observable<Settings>;

  private settingsSubject$: BehaviorSubject<Settings>;

  constructor() {
    const theme = this.getTheme();
    const colorScheme = this.getColorScheme();
    const refreshInterval = this.getRefreshInterval();

    this.applyTheme(theme);

    this.settingsSubject$ = new BehaviorSubject<Settings>({
      theme,
      colorScheme,
      refreshInterval,
    });

    this.settings$ = this.settingsSubject$.asObservable();

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', ({ matches }) => {
        if (this.getTheme() === Theme.SYSTEM) {
          this.applyTheme(matches ? Theme.DARK : Theme.LIGHT);

          this.settingsSubject$.next({
            theme: this.getTheme(),
            colorScheme: this.getColorScheme(),
            refreshInterval: this.getRefreshInterval(),
          });
        }
      });
  }

  public setTheme(theme: Theme): void {
    if (theme && Object.values<string>(Theme).includes(theme) && localStorage) {
      localStorage.setItem(Constants.settings.THEME, theme);

      this.applyTheme(theme);

      this.settingsSubject$.next({
        theme,
        colorScheme: this.getColorScheme(),
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

      this.settingsSubject$.next({
        refreshInterval,
        theme: this.getTheme(),
        colorScheme: this.getColorScheme(),
      });
    }
  }

  private setColorScheme(colorScheme: ColorScheme): void {
    if (
      colorScheme &&
      Object.values<string>(ColorScheme).includes(colorScheme) &&
      localStorage
    ) {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, colorScheme);
    }
  }

  private getTheme(): Theme {
    return (
      localStorage &&
      ((localStorage.getItem(Constants.settings.THEME) ||
        this.DEFAULT_SETTINGS.theme) as Theme)
    );
  }

  private getColorScheme(): ColorScheme {
    return (
      localStorage &&
      ((localStorage.getItem(Constants.settings.COLOR_SCHEME) ||
        this.DEFAULT_SETTINGS.colorScheme) as ColorScheme)
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

      this.setColorScheme(ColorScheme.DARK);
    } else {
      documentElementClassList.contains('dark') &&
        documentElementClassList.remove('dark');

      this.setColorScheme(ColorScheme.LIGHT);
    }
  }
}
