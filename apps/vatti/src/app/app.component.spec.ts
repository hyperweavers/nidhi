import { Platform } from '@angular/cdk/platform';
import { provideHttpClient } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Router,
} from '@angular/router';
import {
  ServiceWorkerModule,
  SwUpdate,
  VersionReadyEvent,
} from '@angular/service-worker';
import { LOGGER } from '@nidhi/shared-logger';
import { Subject } from 'rxjs';

jest.mock('flowbite', () => ({ initFlowbite: jest.fn() }));

import { AppComponent } from './app.component';
import { SettingsService } from './services/core/settings.service';

class MockRouter {
  events = new Subject<unknown>();
  navigate = jest.fn();
  navigateByUrl = jest.fn();
  url = '/';
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockSettingsService: { resize$: Subject<void>; setTheme: jest.Mock };
  let mockRouter: MockRouter;
  let mockSwUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionReadyEvent>;
  };
  let mockPlatform: { IOS: boolean };

  beforeEach(async () => {
    mockRouter = new MockRouter();
    mockSettingsService = { resize$: new Subject<void>(), setTheme: jest.fn() };
    mockSwUpdate = {
      isEnabled: false,
      versionUpdates: new Subject<VersionReadyEvent>(),
    };
    mockPlatform = { IOS: false };

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: false }),
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        provideHttpClient(),
        {
          provide: LOGGER,
          useValue: {
            captureException: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
          },
        },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SwUpdate, useValue: mockSwUpdate },
        { provide: Platform, useValue: mockPlatform },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should close sidebar on NavigationStart', fakeAsync(() => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      mockRouter.events.next(new NavigationStart(1, '/test'));
      tick(100);
      expect(component.sidebarOpen).toBe(false);
    }));

    it('should open sidebar on resize when clientWidth >= 1024 and closed', () => {
      fixture.detectChanges();
      component.sidebarOpen = false;
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1200,
        configurable: true,
      });
      mockSettingsService.resize$.next();
      expect(component.sidebarOpen).toBe(true);
    });

    it('should close sidebar on resize when width < 1024', () => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 800,
        configurable: true,
      });
      mockSettingsService.resize$.next();
      expect(component.sidebarOpen).toBe(false);
    });

    it('should call initFlowbite on NavigationEnd', fakeAsync(() => {
      const { initFlowbite } = require('flowbite');
      fixture.detectChanges();
      mockRouter.events.next(new NavigationEnd(1, '/test', '/test'));
      tick(100);
      expect(initFlowbite).toHaveBeenCalled();
    }));

    it('should not open sidebar on resize when already open at large width', () => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1200,
        configurable: true,
      });
      mockSettingsService.resize$.next();
      expect(component.sidebarOpen).toBe(true);
    });

    it('should show update modal when version update is ready', () => {
      mockSwUpdate.isEnabled = true;
      fixture.detectChanges();
      mockSwUpdate.versionUpdates.next({
        type: 'VERSION_READY',
      } as VersionReadyEvent);
      expect(component.showUpdateModal).toBe(true);
    });

    it('should show install modal on iOS when not in standalone', () => {
      mockPlatform.IOS = true;
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        configurable: true,
      });
      fixture.detectChanges();
      expect(component.showInstallModal).toBe(true);
      expect(component.ios).toBe(true);
    });

    it('should not show install modal when iOS standalone', () => {
      mockPlatform.IOS = true;
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });
      fixture.detectChanges();
      expect(component.showInstallModal).toBeUndefined();
    });

    it('should do nothing on other router events', fakeAsync(() => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      mockRouter.events.next('OTHER_EVENT');
      tick(100);
      expect(component.sidebarOpen).toBe(true);
    }));

    it('should add beforeinstallprompt listener when not iOS', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      fixture.detectChanges();
      const listener = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeinstallprompt',
      )?.[1] as (event: Event) => void;
      expect(listener).toBeDefined();
      const preventDefault = jest.fn();
      listener({ preventDefault } as unknown as Event);
      expect(component.showInstallModal).toBe(true);
    });
  });

  describe('updateApp', () => {
    it('should set showUpdateModal to false', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      component.showUpdateModal = true;
      component.updateApp();
      expect(component.showUpdateModal).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('closeUpdateModal', () => {
    it('should set showUpdateModal to false', () => {
      component.showUpdateModal = true;
      component.closeUpdateModal();
      expect(component.showUpdateModal).toBe(false);
    });
  });

  describe('installApp', () => {
    it('should call prompt and close modal', () => {
      const promptMock = jest.fn();
      (component as unknown as Record<string, unknown>).pwaInstallPromptEvent =
        {
          prompt: promptMock,
        };
      component.installApp();
      expect(promptMock).toHaveBeenCalled();
      expect(component.showInstallModal).toBe(false);
    });

    it('should not throw if no prompt event', () => {
      expect(() => component.installApp()).not.toThrow();
      expect(component.showInstallModal).toBe(false);
    });
  });

  describe('closeInstallModal', () => {
    it('should set showInstallModal to false', () => {
      component.showInstallModal = true;
      component.closeInstallModal();
      expect(component.showInstallModal).toBe(false);
    });
  });

  describe('toggleSidebar', () => {
    it('should set sidebarOpen to true when width >= 1024', () => {
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1200,
        configurable: true,
      });
      component.sidebarOpen = false;
      component.toggleSidebar();
      expect(component.sidebarOpen).toBe(true);
    });

    it('should toggle sidebar when width < 1024', () => {
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 800,
        configurable: true,
      });
      component.sidebarOpen = false;
      component.toggleSidebar();
      expect(component.sidebarOpen).toBe(true);
      component.toggleSidebar();
      expect(component.sidebarOpen).toBe(false);
    });
  });

  describe('share', () => {
    beforeEach(() => {
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 800,
        configurable: true,
      });
    });

    afterEach(() => {
      delete (navigator as Record<string, unknown>).canShare;
      delete (navigator as Record<string, unknown>).share;
    });

    it('should use Web Share API when available', async () => {
      const shareMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });
      await component.share();
      expect(shareMock).toHaveBeenCalled();
    });

    it('should fallback to mailto when Web Share unavailable', async () => {
      Object.defineProperty(navigator, 'canShare', {
        value: undefined,
        configurable: true,
      });
      const anchor = { href: '', click: jest.fn(), remove: jest.fn() };
      jest
        .spyOn(document, 'createElement')
        .mockReturnValue(anchor as unknown as HTMLElement);
      await component.share();
      expect(anchor.click).toHaveBeenCalled();
    });

    it('should log error when Web Share API throws', async () => {
      const logger = TestBed.inject(LOGGER);
      const shareMock = jest.fn().mockRejectedValue(new Error('share failed'));
      Object.defineProperty(navigator, 'canShare', {
        value: () => true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });
      await component.share();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('share failed'),
      );
    });
  });

  describe('public properties', () => {
    it('should expose Routes', () => {
      expect(component.Routes).toBeDefined();
    });

    it('should expose appVersion', () => {
      expect(component.appVersion).toBeDefined();
    });
  });
});
