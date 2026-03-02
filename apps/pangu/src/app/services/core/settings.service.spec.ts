import { TestBed } from '@angular/core/testing';
import { Constants } from '../../constants';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let matchMediaMock: jest.Mock;
  let addEventListenerMock: jest.Mock;
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    addEventListenerMock = jest.fn();
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('Initialization', () => {
    it('should initialize with default values if local storage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      service = TestBed.inject(SettingsService);

      expect(service).toBeTruthy();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        Constants.settings.THEME,
      );

      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings).toEqual({
        theme: Theme.SYSTEM,
        colorScheme: ColorScheme.DARK, // initial default evaluates to DARK before applyScheme replaces storage
        refreshInterval: RefreshInterval.THIRTY_SECONDS,
      });
    });

    it('should initialize with local storage values if present', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === Constants.settings.THEME) return Theme.DARK;
        if (key === Constants.settings.REFRESH_INTERVAL)
          return String(RefreshInterval.ONE_MINUTE);
        if (key === Constants.settings.COLOR_SCHEME) return ColorScheme.DARK;
        return null;
      });

      matchMediaMock.mockReturnValue({
        matches: false, // User config overrules
        addEventListener: addEventListenerMock,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings).toEqual({
        theme: Theme.DARK,
        colorScheme: ColorScheme.DARK,
        refreshInterval: RefreshInterval.ONE_MINUTE,
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should initialize correctly if localStorage is unavailable', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings).toBeTruthy();
    });

    it('should initialize dark theme if system prefers dark and theme is SYSTEM', () => {
      mockLocalStorage.getItem.mockReturnValue(Theme.SYSTEM);
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: addEventListenerMock,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Theme handling', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
      mockLocalStorage.getItem.mockReturnValue(null);
      service = TestBed.inject(SettingsService);
    });

    it('should set valid theme and apply it', () => {
      service.setTheme(Theme.LIGHT);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        Constants.settings.THEME,
        Theme.LIGHT,
      );
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings?.theme).toBe(Theme.LIGHT);
    });

    it('should set valid theme SYSTEM and apply dark if system is dark', () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: addEventListenerMock,
      });
      service.setTheme(Theme.SYSTEM);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should ignore invalid undefined theme', () => {
      mockLocalStorage.setItem.mockClear();
      service.setTheme(undefined as any);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should ignore invalid theme values', () => {
      mockLocalStorage.setItem.mockClear();
      service.setTheme('invalid-theme' as Theme);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle matchMedia change event for SYSTEM theme turning dark', () => {
      // Re-init so it binds system theme logic
      mockLocalStorage.getItem.mockImplementation((key) =>
        key === Constants.settings.THEME ? Theme.SYSTEM : null,
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      mockLocalStorage.setItem.mockClear();

      // Trigger the listener
      expect(addEventListenerMock).toHaveBeenCalled();
      const changeCallback = addEventListenerMock.mock.calls[0][1];
      changeCallback({ matches: true }); // dark mode pref enabled

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        Constants.settings.COLOR_SCHEME,
        ColorScheme.DARK,
      );

      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings?.theme).toBe(Theme.SYSTEM);
      expect(currentSettings?.colorScheme).toBe(ColorScheme.DARK);
    });

    it('should handle matchMedia change event for SYSTEM theme turning light', () => {
      mockLocalStorage.getItem.mockImplementation((key) =>
        key === Constants.settings.THEME ? Theme.SYSTEM : null,
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);

      // Ensure start state has dark class for test assertion later
      document.documentElement.classList.add('dark');

      const changeCallback = addEventListenerMock.mock.calls[0][1];
      changeCallback({ matches: false }); // light mode pref enabled

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        Constants.settings.COLOR_SCHEME,
        ColorScheme.LIGHT,
      );
    });

    it('should ignore matchMedia change if theme is not SYSTEM', () => {
      mockLocalStorage.getItem.mockImplementation((key) =>
        key === Constants.settings.THEME ? Theme.LIGHT : null,
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      mockLocalStorage.setItem.mockClear();

      const changeCallback = addEventListenerMock.mock.calls[0][1];
      changeCallback({ matches: true }); // dark mode pref enabled

      // shouldn't do anything because theme is LIGHT
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        Constants.settings.COLOR_SCHEME,
        ColorScheme.DARK,
      );
    });

    it('should fallback gently if localStorage is undefined when trying to set theme', () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });
      service.setTheme(Theme.DARK);
      // it should not crash.
    });
  });

  describe('RefreshInterval handling', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
      service = TestBed.inject(SettingsService);
    });

    it('should set valid refresh interval', () => {
      mockLocalStorage.setItem.mockClear();
      service.setRefreshInterval(RefreshInterval.FIFTEEN_SECONDS);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        Constants.settings.REFRESH_INTERVAL,
        String(RefreshInterval.FIFTEEN_SECONDS),
      );

      let currentSettings;
      service.settings$.subscribe((s) => (currentSettings = s));
      expect(currentSettings?.refreshInterval).toBe(
        RefreshInterval.FIFTEEN_SECONDS,
      );
    });

    it('should ignore invalid refresh interval', () => {
      mockLocalStorage.setItem.mockClear();

      service.setRefreshInterval('not-a-number' as any);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      service.setRefreshInterval(null as any);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // out of bounds enum value
      service.setRefreshInterval(999999 as any);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should gently skip if localStorage is undefined for setRefreshInterval', () => {
      Object.defineProperty(window, 'localStorage', { value: undefined });
      service.setRefreshInterval(RefreshInterval.ONE_MINUTE);
      // shouldn't crash
    });
  });

  describe('applyTheme functionality', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
    });

    it('should add dark class if theme is DARK', () => {
      document.documentElement.classList.remove('dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      service.setTheme(Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not throw or duplicate if dark class already present and theme is DARK', () => {
      document.documentElement.classList.add('dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      service.setTheme(Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class if theme is LIGHT', () => {
      document.documentElement.classList.add('dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      service.setTheme(Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should do nothing if dark class absent and theme is LIGHT', () => {
      document.documentElement.classList.remove('dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      service = TestBed.inject(SettingsService);
      service.setTheme(Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should skip setting color scheme if private method is called with invalid parameters', () => {
      mockLocalStorage.setItem.mockClear();
      service['setColorScheme'](undefined as any);
      service['setColorScheme']('invalid' as any);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should evaluate all permutations of theme and system preference', () => {
      // 1. SYSTEM + true
      matchMediaMock.mockReturnValue({ matches: true });
      service['applyTheme'](Theme.SYSTEM);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 2. SYSTEM + false
      matchMediaMock.mockReturnValue({ matches: false });
      service['applyTheme'](Theme.SYSTEM);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // 3. DARK + true
      matchMediaMock.mockReturnValue({ matches: true });
      service['applyTheme'](Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 4. DARK + false
      matchMediaMock.mockReturnValue({ matches: false });
      service['applyTheme'](Theme.DARK);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // 5. LIGHT + true
      matchMediaMock.mockReturnValue({ matches: true });
      service['applyTheme'](Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // 6. LIGHT + false
      matchMediaMock.mockReturnValue({ matches: false });
      service['applyTheme'](Theme.LIGHT);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
