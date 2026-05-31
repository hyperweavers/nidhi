import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { skip } from 'rxjs';

import { SettingsService } from './settings.service';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { Constants } from '../../constants';

describe('SettingsService', () => {
  let service: SettingsService;
  let matchMediaListeners: Map<string, (evt: { matches: boolean }) => void>;

  beforeEach(() => {
    matchMediaListeners = new Map();
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (
          _type: string,
          listener: (evt: { matches: boolean }) => void,
        ) => {
          matchMediaListeners.set(query, listener);
        },
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    jest.spyOn(document.documentElement.classList, 'add');
    jest.spyOn(document.documentElement.classList, 'remove');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should emit default settings when localStorage is empty', (done) => {
      service = TestBed.inject(SettingsService);

      service.settings$.subscribe((settings) => {
        expect(settings.theme).toBe(Theme.SYSTEM);
        expect(settings.colorScheme).toBe(ColorScheme.DARK);
        expect(settings.refreshInterval).toBe(RefreshInterval.THIRTY_SECONDS);
        done();
      });
    });

    it('should restore theme from localStorage', (done) => {
      localStorage.setItem(Constants.settings.THEME, Theme.LIGHT);
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );

      service = TestBed.inject(SettingsService);

      service.settings$.subscribe((settings) => {
        expect(settings.theme).toBe(Theme.LIGHT);
        expect(settings.refreshInterval).toBe(RefreshInterval.ONE_MINUTE);
        done();
      });
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      service = TestBed.inject(SettingsService);
    });

    it('should update theme, apply dark class, persist to localStorage, and emit', (done) => {
      localStorage.removeItem(Constants.settings.THEME);
      localStorage.removeItem(Constants.settings.COLOR_SCHEME);

      service.settings$.pipe(skip(1)).subscribe((settings) => {
        expect(settings.theme).toBe(Theme.DARK);
        expect(settings.colorScheme).toBe(ColorScheme.DARK);
        expect(
          localStorage.getItem(Constants.settings.THEME),
        ).toBe(Theme.DARK);
        expect(
          localStorage.getItem(Constants.settings.COLOR_SCHEME),
        ).toBe(ColorScheme.DARK);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        done();
      });

      service.setTheme(Theme.DARK);
    });

    it('should remove dark class when theme is LIGHT', () => {
      document.documentElement.classList.add('dark');
      service.setTheme(Theme.LIGHT);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(
        localStorage.getItem(Constants.settings.COLOR_SCHEME),
      ).toBe(ColorScheme.LIGHT);
    });

    it('should not duplicate dark class when already applied', () => {
      service.setTheme(Theme.DARK);
      (document.documentElement.classList.add as jest.Mock).mockClear();

      service.setTheme(Theme.DARK);

      expect(
        (document.documentElement.classList.add as jest.Mock),
      ).not.toHaveBeenCalledWith('dark');
    });

    it('should do nothing when theme is invalid', () => {
      service.setTheme('invalid' as Theme);

      expect(
        localStorage.getItem(Constants.settings.THEME),
      ).toBeNull();
      expect(
        (document.documentElement.classList.add as jest.Mock),
      ).not.toHaveBeenCalled();
      expect(
        (document.documentElement.classList.remove as jest.Mock),
      ).not.toHaveBeenCalled();
    });

    it('should do nothing when theme is undefined', () => {
      service.setTheme(undefined as unknown as Theme);

      expect(localStorage.getItem(Constants.settings.THEME)).toBeNull();
    });
  });

  describe('setRefreshInterval', () => {
    beforeEach(() => {
      service = TestBed.inject(SettingsService);
    });

    it('should update interval, persist to localStorage, and emit', (done) => {
      localStorage.removeItem(Constants.settings.REFRESH_INTERVAL);

      service.settings$.pipe(skip(1)).subscribe((settings) => {
        expect(settings.refreshInterval).toBe(RefreshInterval.ONE_MINUTE);
        expect(
          localStorage.getItem(Constants.settings.REFRESH_INTERVAL),
        ).toBe(String(RefreshInterval.ONE_MINUTE));
        done();
      });

      service.setRefreshInterval(RefreshInterval.ONE_MINUTE);
    });

    it('should do nothing when refreshInterval is NaN', () => {
      service.setRefreshInterval(NaN as unknown as RefreshInterval);

      expect(
        localStorage.getItem(Constants.settings.REFRESH_INTERVAL),
      ).toBeNull();
    });

    it('should do nothing when refreshInterval is not a valid enum value', () => {
      service.setRefreshInterval(12345 as RefreshInterval);

      expect(
        localStorage.getItem(Constants.settings.REFRESH_INTERVAL),
      ).toBeNull();
    });

    it('should do nothing when refreshInterval is undefined', () => {
      service.setRefreshInterval(undefined as unknown as RefreshInterval);

      expect(
        localStorage.getItem(Constants.settings.REFRESH_INTERVAL),
      ).toBeNull();
    });
  });

  describe('color scheme change listener', () => {
    it('should apply dark mode when system color scheme changes to dark and theme is SYSTEM', (done) => {
      service = TestBed.inject(SettingsService);

      service.settings$.pipe(skip(1)).subscribe((settings) => {
        expect(settings.theme).toBe(Theme.SYSTEM);
        expect(settings.colorScheme).toBe(ColorScheme.DARK);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        done();
      });

      const listener = matchMediaListeners.get(
        '(prefers-color-scheme: dark)',
      );
      listener!({ matches: true });
    });

    it('should apply light theme when system color scheme changes to light and theme is SYSTEM', (done) => {
      service = TestBed.inject(SettingsService);
      document.documentElement.classList.add('dark');

      service.settings$.pipe(skip(1)).subscribe((settings) => {
        expect(settings.colorScheme).toBe(ColorScheme.LIGHT);
        expect(
          document.documentElement.classList.contains('dark'),
        ).toBe(false);
        done();
      });

      const listener = matchMediaListeners.get(
        '(prefers-color-scheme: dark)',
      );
      listener!({ matches: false });
    });

    it('should not update when theme is not SYSTEM', () => {
      service = TestBed.inject(SettingsService);
      service.setTheme(Theme.DARK);
      (document.documentElement.classList.add as jest.Mock).mockClear();

      const listener = matchMediaListeners.get(
        '(prefers-color-scheme: dark)',
      );
      listener!({ matches: true });

      expect(
        (document.documentElement.classList.add as jest.Mock),
      ).not.toHaveBeenCalled();
    });
  });

  describe('applyTheme', () => {
    describe('SYSTEM theme', () => {
      it('should apply light theme when prefers-color-scheme is light', () => {
        jest
          .spyOn(window, 'matchMedia')
          .mockReturnValue({
            matches: false,
            media: '(prefers-color-scheme: dark)',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          } as any);

        service = TestBed.inject(SettingsService);

        expect(
          document.documentElement.classList.contains('dark'),
        ).toBe(false);
      });

      it('should apply dark theme when prefers-color-scheme is dark', () => {
        jest
          .spyOn(window, 'matchMedia')
          .mockReturnValue({
            matches: true,
            media: '(prefers-color-scheme: dark)',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          } as any);

        service = TestBed.inject(SettingsService);

        expect(
          document.documentElement.classList.contains('dark'),
        ).toBe(true);
      });
    });

    describe('DARK theme', () => {
      it('should add dark class when not already present', () => {
        service = TestBed.inject(SettingsService);
        document.documentElement.classList.remove('dark');
        (document.documentElement.classList.add as jest.Mock).mockClear();

        service.setTheme(Theme.DARK);

        expect(
          (document.documentElement.classList.add as jest.Mock),
        ).toHaveBeenCalledWith('dark');
      });

      it('should set color scheme to DARK in localStorage', () => {
        service = TestBed.inject(SettingsService);
        localStorage.removeItem(Constants.settings.COLOR_SCHEME);

        service.setTheme(Theme.DARK);

        expect(
          localStorage.getItem(Constants.settings.COLOR_SCHEME),
        ).toBe(ColorScheme.DARK);
      });
    });
  });

  describe('resize$', () => {
    it('should emit on window resize after debounce', fakeAsync(() => {
      service = TestBed.inject(SettingsService);

      let emitted = false;
      service.resize$.subscribe(() => {
        emitted = true;
      });

      window.dispatchEvent(new Event('resize'));
      tick(500);

      expect(emitted).toBe(true);
    }));
  });

  describe('edge cases', () => {
    it('should handle getColorScheme when localStorage has a stored value', () => {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.LIGHT);

      service = TestBed.inject(SettingsService);

      expect(
        localStorage.getItem(Constants.settings.COLOR_SCHEME),
      ).toBe(ColorScheme.LIGHT);
    });

    it('should not set theme when theme is empty string', () => {
      service = TestBed.inject(SettingsService);

      service.setTheme('' as Theme);

      expect(localStorage.getItem(Constants.settings.THEME)).toBeNull();
    });

    it('should restore previously stored color scheme from localStorage on init', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.DARK);
      localStorage.setItem(
        Constants.settings.COLOR_SCHEME,
        ColorScheme.DARK,
      );

      service = TestBed.inject(SettingsService);

      expect(
        localStorage.getItem(Constants.settings.COLOR_SCHEME),
      ).toBe(ColorScheme.DARK);
    });

    it('should not persist color scheme from setColorScheme when value is not in the enum', () => {
      jest.spyOn(Array.prototype, 'includes').mockReturnValueOnce(false);

      service = TestBed.inject(SettingsService);

      expect(
        localStorage.getItem(Constants.settings.COLOR_SCHEME),
      ).toBeNull();
    });
  });
});
