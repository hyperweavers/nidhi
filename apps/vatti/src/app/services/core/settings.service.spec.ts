import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Constants } from '../../constants';
import { Theme } from '../../models/settings';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let documentRef: Document;
  let matchMediaListener: ((event: { matches: boolean }) => void) | null;

  function createMatchMediaMock(matches: boolean) {
    return {
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: jest.fn(
        (_event: string, listener: (event: { matches: boolean }) => void) => {
          if (_event === 'change') {
            matchMediaListener = listener;
          }
        },
      ),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    matchMediaListener = null;
    window.matchMedia = jest.fn().mockReturnValue(createMatchMediaMock(false));

    TestBed.configureTestingModule({
      providers: [SettingsService],
    });
    service = TestBed.inject(SettingsService);
    documentRef = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('settings$', () => {
    it('should emit initial settings', (done) => {
      service.settings$.subscribe((settings) => {
        expect(settings.theme).toBeDefined();
        expect(settings.colorScheme).toBeDefined();
        done();
      });
    });
  });

  describe('setTheme', () => {
    it('should store theme in localStorage when valid', () => {
      service.setTheme(Theme.DARK);
      expect(localStorage.getItem(Constants.settings.THEME)).toBe('dark');
    });

    it('should apply dark theme', () => {
      service.setTheme(Theme.DARK);
      expect(documentRef.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme and remove dark class', () => {
      documentRef.documentElement.classList.add('dark');
      service.setTheme(Theme.LIGHT);
      expect(documentRef.documentElement.classList.contains('dark')).toBe(
        false,
      );
    });

    it('should apply light theme when dark class not present', () => {
      documentRef.documentElement.classList.remove('dark');
      service.setTheme(Theme.LIGHT);
      expect(documentRef.documentElement.classList.contains('dark')).toBe(
        false,
      );
    });

    it('should not store theme when invalid', () => {
      service.setTheme('invalid' as Theme);
      expect(localStorage.getItem(Constants.settings.THEME)).toBeNull();
    });

    it('should emit new settings', (done) => {
      service.settings$.subscribe((settings) => {
        if (settings.theme === Theme.LIGHT) {
          expect(settings.colorScheme).toBeDefined();
          done();
        }
      });
      service.setTheme(Theme.LIGHT);
    });
  });

  describe('matchMedia change event listener', () => {
    it('should apply dark theme when system changes to dark and theme is SYSTEM', () => {
      service.setTheme(Theme.SYSTEM);
      documentRef.documentElement.classList.remove('dark');

      matchMediaListener?.({ matches: true });

      expect(documentRef.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply light theme when system changes to light and theme is SYSTEM', () => {
      window.matchMedia = jest.fn().mockReturnValue(createMatchMediaMock(true));
      service.setTheme(Theme.SYSTEM);
      documentRef.documentElement.classList.add('dark');

      matchMediaListener?.({ matches: false });

      expect(documentRef.documentElement.classList.contains('dark')).toBe(
        false,
      );
    });

    it('should not change theme when theme is not SYSTEM', () => {
      service.setTheme(Theme.DARK);
      documentRef.documentElement.classList.remove('dark');

      matchMediaListener?.({ matches: true });

      expect(documentRef.documentElement.classList.contains('dark')).toBe(
        false,
      );
    });
  });

  describe('applyTheme edge cases', () => {
    it('should skip adding dark class when already present', () => {
      documentRef.documentElement.classList.add('dark');
      service.setTheme(Theme.DARK);
      expect(documentRef.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not store color scheme when value is invalid', () => {
      (
        service as unknown as { setColorScheme: (cs: unknown) => void }
      ).setColorScheme(undefined);
      expect(localStorage.getItem('colorScheme')).toBeNull();
    });
  });

  describe('resize$', () => {
    it('should be defined', () => {
      expect(service.resize$).toBeDefined();
    });
  });
});
