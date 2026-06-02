import { TestBed } from '@angular/core/testing';
import { firstValueFrom, timeout } from 'rxjs';

import { Constants } from '../../constants';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let mediaChangeListener: ((event: { matches: boolean }) => void) | undefined;

  function setupMatchMediaMock(initialMatches = false) {
    jest
      .spyOn(window as any, 'matchMedia')
      .mockImplementation((query: string) => ({
        matches: initialMatches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest
          .fn()
          .mockImplementation(
            (event: string, handler: (evt: { matches: boolean }) => void) => {
              if (event === 'change') {
                mediaChangeListener = handler;
              }
            },
          ),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mediaChangeListener = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create with default settings when localStorage is empty', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(service).toBeTruthy();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark theme when system prefers dark and theme is SYSTEM', () => {
      setupMatchMediaMock(true);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should read stored theme from localStorage', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.DARK);
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should read stored refreshInterval from localStorage', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const settings = (service as any).settingsSubject$.getValue();
      expect(settings.refreshInterval).toBe(RefreshInterval.ONE_MINUTE);
    });

    it('should read stored colorScheme from localStorage', () => {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.LIGHT);
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const settings = (service as any).settingsSubject$.getValue();
      expect(settings.colorScheme).toBe(ColorScheme.LIGHT);
    });
  });

  describe('settings$', () => {
    it('should emit initial settings on subscription', async () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const settings = await firstValueFrom(
        service.settings$.pipe(timeout(3000)),
      );
      expect(settings.theme).toBeDefined();
      expect(settings.colorScheme).toBeDefined();
      expect(settings.refreshInterval).toBeDefined();
    });

    it('should emit updated settings after setTheme', async () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      service.setTheme(Theme.DARK);
      const settings = await firstValueFrom(
        service.settings$.pipe(timeout(3000)),
      );
      expect(settings.theme).toBe(Theme.DARK);
    });

    it('should emit updated settings after setRefreshInterval', async () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      service.setRefreshInterval(RefreshInterval.ONE_MINUTE);
      const settings = await firstValueFrom(
        service.settings$.pipe(timeout(3000)),
      );
      expect(settings.refreshInterval).toBe(RefreshInterval.ONE_MINUTE);
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
    });

    it('should store theme in localStorage and apply dark class for DARK', () => {
      service.setTheme(Theme.DARK);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe(Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class for LIGHT', () => {
      document.documentElement.classList.add('dark');
      service.setTheme(Theme.LIGHT);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe(Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply dark class when SYSTEM prefers dark', () => {
      jest.restoreAllMocks();
      setupMatchMediaMock(true);
      service.setTheme(Theme.SYSTEM);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light class when SYSTEM prefers light', () => {
      service.setTheme(Theme.SYSTEM);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should not update localStorage for invalid theme', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.LIGHT);
      service.setTheme('invalid_theme' as Theme);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe(Theme.LIGHT);
    });

    it('should not update when theme is null', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.LIGHT);
      service.setTheme(null as unknown as Theme);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe(Theme.LIGHT);
    });

    it('should not update when theme is undefined', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.LIGHT);
      service.setTheme(undefined as unknown as Theme);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe(Theme.LIGHT);
    });

    it('should emit updated colorScheme and refreshInterval in new settings', async () => {
      service.setTheme(Theme.DARK);
      const settings = await firstValueFrom(
        service.settings$.pipe(timeout(3000)),
      );
      expect(settings.colorScheme).toBe(ColorScheme.DARK);
      expect(settings.refreshInterval).toBeDefined();
    });
  });

  describe('setRefreshInterval', () => {
    beforeEach(() => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
    });

    it('should store refreshInterval in localStorage', () => {
      service.setRefreshInterval(RefreshInterval.ONE_MINUTE);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.ONE_MINUTE),
      );
    });

    it('should not update for null value', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      service.setRefreshInterval(null as unknown as RefreshInterval);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.ONE_MINUTE),
      );
    });

    it('should not update for undefined value', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      service.setRefreshInterval(undefined as unknown as RefreshInterval);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.ONE_MINUTE),
      );
    });

    it('should not update for NaN value', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      service.setRefreshInterval(NaN as unknown as RefreshInterval);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.ONE_MINUTE),
      );
    });

    it('should not update for value not in RefreshInterval enum', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      service.setRefreshInterval(12345 as unknown as RefreshInterval);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.ONE_MINUTE),
      );
    });

    it('should update for FIFTEEN_SECONDS value', () => {
      service.setRefreshInterval(RefreshInterval.FIFTEEN_SECONDS);
      expect(localStorage.getItem(Constants.settings.REFRESH_INTERVAL)).toBe(
        String(RefreshInterval.FIFTEEN_SECONDS),
      );
    });

    it('should emit updated theme and colorScheme in new settings', async () => {
      service.setRefreshInterval(RefreshInterval.ONE_MINUTE);
      const settings = await firstValueFrom(
        service.settings$.pipe(timeout(3000)),
      );
      expect(settings.theme).toBeDefined();
      expect(settings.colorScheme).toBeDefined();
    });
  });

  describe('applyTheme (private)', () => {
    beforeEach(() => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
    });

    it('should add dark class when applying DARK theme', () => {
      (service as any).applyTheme(Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when applying LIGHT theme', () => {
      document.documentElement.classList.add('dark');
      (service as any).applyTheme(Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should not add dark class twice', () => {
      document.documentElement.classList.add('dark');
      (service as any).applyTheme(Theme.DARK);
      const classList = document.documentElement.classList;
      const darkCount = Array.from(classList).filter(
        (c) => c === 'dark',
      ).length;
      expect(darkCount).toBe(1);
    });

    it('should not remove dark class twice', () => {
      (service as any).applyTheme(Theme.LIGHT);
      const classList = document.documentElement.classList;
      const darkCount = Array.from(classList).filter(
        (c) => c === 'dark',
      ).length;
      expect(darkCount).toBe(0);
    });

    it('should call setColorScheme with DARK when applying dark theme', () => {
      const setColorSchemeSpy = jest.spyOn(
        SettingsService.prototype as any,
        'setColorScheme',
      );
      (service as any).applyTheme(Theme.DARK);
      expect(setColorSchemeSpy).toHaveBeenCalledWith(ColorScheme.DARK);
    });

    it('should call setColorScheme with LIGHT when applying light theme', () => {
      const setColorSchemeSpy = jest.spyOn(
        SettingsService.prototype as any,
        'setColorScheme',
      );
      (service as any).applyTheme(Theme.LIGHT);
      expect(setColorSchemeSpy).toHaveBeenCalledWith(ColorScheme.LIGHT);
    });
  });

  describe('getTheme (private)', () => {
    it('should return default theme when localStorage is empty', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const theme = (service as any).getTheme();
      expect(theme).toBe(Theme.SYSTEM);
    });

    it('should return stored theme when present', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.DARK);
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const theme = (service as any).getTheme();
      expect(theme).toBe(Theme.DARK);
    });
  });

  describe('getColorScheme (private)', () => {
    it('should return default color scheme when localStorage is empty', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const scheme = (service as any).getColorScheme();
      expect(scheme).toBe(ColorScheme.LIGHT);
    });

    it('should return stored color scheme when present', () => {
      localStorage.setItem(Constants.settings.THEME, Theme.DARK);
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.DARK);
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const scheme = (service as any).getColorScheme();
      expect(scheme).toBe(ColorScheme.DARK);
    });
  });

  describe('getRefreshInterval (private)', () => {
    it('should return default interval when localStorage is empty', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const interval = (service as any).getRefreshInterval();
      expect(interval).toBe(RefreshInterval.THIRTY_SECONDS);
    });

    it('should return stored interval when present', () => {
      localStorage.setItem(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.ONE_MINUTE),
      );
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const interval = (service as any).getRefreshInterval();
      expect(interval).toBe(RefreshInterval.ONE_MINUTE);
    });

    it('should return default when stored value is 0', () => {
      localStorage.setItem(Constants.settings.REFRESH_INTERVAL, '0');
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const interval = (service as any).getRefreshInterval();
      expect(interval).toBe(RefreshInterval.THIRTY_SECONDS);
    });
  });

  describe('setColorScheme (private)', () => {
    beforeEach(() => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
    });

    it('should store color scheme in localStorage', () => {
      (service as any).setColorScheme(ColorScheme.DARK);
      expect(localStorage.getItem(Constants.settings.COLOR_SCHEME)).toBe(
        ColorScheme.DARK,
      );
    });

    it('should not store undefined color scheme', () => {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.LIGHT);
      (service as any).setColorScheme(undefined);
      expect(localStorage.getItem(Constants.settings.COLOR_SCHEME)).toBe(
        ColorScheme.LIGHT,
      );
    });

    it('should not store null color scheme', () => {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.LIGHT);
      (service as any).setColorScheme(null);
      expect(localStorage.getItem(Constants.settings.COLOR_SCHEME)).toBe(
        ColorScheme.LIGHT,
      );
    });

    it('should not store invalid color scheme', () => {
      localStorage.setItem(Constants.settings.COLOR_SCHEME, ColorScheme.LIGHT);
      (service as any).setColorScheme('invalid_scheme');
      expect(localStorage.getItem(Constants.settings.COLOR_SCHEME)).toBe(
        ColorScheme.LIGHT,
      );
    });
  });

  describe('matchMedia listener', () => {
    it('should apply dark theme when system preference changes to dark and theme is SYSTEM', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      mediaChangeListener?.({ matches: true });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme when system preference changes to light and theme is SYSTEM', () => {
      setupMatchMediaMock(true);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      mediaChangeListener?.({ matches: false });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should not change theme when current theme is not SYSTEM', () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      service.setTheme(Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      mediaChangeListener?.({ matches: true });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should emit new settings when matchMedia triggers change', async () => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      let settingsEmitted = false;
      const sub = service.settings$.subscribe(() => {
        settingsEmitted = true;
      });

      mediaChangeListener?.({ matches: true });
      expect(settingsEmitted).toBe(true);
      sub.unsubscribe();
    });
  });

  describe('resize$', () => {
    it('should emit on window resize event after debounce', (done) => {
      setupMatchMediaMock(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      const timeoutId = setTimeout(() => {
        done(new Error('Timed out waiting for resize emission'));
      }, 1500);

      service.resize$.subscribe({
        next: (event) => {
          clearTimeout(timeoutId);
          expect(event).toBeDefined();
          expect(event.type).toBe('resize');
          done();
        },
      });

      window.dispatchEvent(new Event('resize'));
    });
  });
});
