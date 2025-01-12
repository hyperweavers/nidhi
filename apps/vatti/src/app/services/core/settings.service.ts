import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, debounceTime, fromEvent } from 'rxjs';

import { DOCUMENT } from '@angular/common';
import { Constants } from '../../constants';
import {
  ColorScheme,
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
  };

  public settings$: Observable<Settings>;
  public resize$: Observable<Event>;

  private settingsSubject$: BehaviorSubject<Settings>;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const theme = this.getTheme();
    const colorScheme = this.getColorScheme();

    this.applyTheme(theme);

    this.settingsSubject$ = new BehaviorSubject<Settings>({
      theme,
      colorScheme,
    });

    this.settings$ = this.settingsSubject$.asObservable();

    this.resize$ = fromEvent(window, 'resize').pipe(debounceTime(500));

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', ({ matches }) => {
        if (this.getTheme() === Theme.SYSTEM) {
          this.applyTheme(matches ? Theme.DARK : Theme.LIGHT);

          this.settingsSubject$.next({
            theme: this.getTheme(),
            colorScheme: this.getColorScheme(),
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

  private applyTheme(theme: Theme): void {
    const documentElementClassList = this.document.documentElement.classList;

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
