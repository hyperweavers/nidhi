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
import { ServiceWorkerModule, SwUpdate } from '@angular/service-worker';
import { LOGGER } from '@nidhi/shared-logger';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { MarketStatus, Status } from './models/market';
import { MarketService } from './services/core/market.service';
import { SettingsService } from './services/core/settings.service';

const mockMarketStatus: MarketStatus = {
  lastUpdated: Date.now(),
  status: Status.OPEN,
  startTime: Date.now() - 3600000,
  endTime: Date.now() + 3600000,
};

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
  let mockMarketService: {
    marketStatus$: Subject<MarketStatus>;
    refresh: jest.Mock;
  };
  let mockRouter: MockRouter;

  beforeEach(async () => {
    mockRouter = new MockRouter();
    mockSettingsService = { resize$: new Subject<void>(), setTheme: jest.fn() };
    mockMarketService = {
      marketStatus$: new Subject<MarketStatus>(),
      refresh: jest.fn(),
    };

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
        { provide: MarketService, useValue: mockMarketService },
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

  it('should set refreshing to false on marketStatus emit', () => {
    fixture.detectChanges();
    component.refreshing = true;
    mockMarketService.marketStatus$.next(mockMarketStatus);
    expect(component.refreshing).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should close sidebar on NavigationStart', fakeAsync(() => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      mockRouter.events.next(new NavigationStart(1, '/test'));
      tick(100);
      expect(component.sidebarOpen).toBe(false);
    }));

    it('should init flowbite on NavigationEnd', fakeAsync(() => {
      fixture.detectChanges();
      mockRouter.events.next(new NavigationEnd(1, '/test', '/test'));
      tick(100);
    }));

    it('should not change sidebarOpen for non-navigation events', fakeAsync(() => {
      fixture.detectChanges();
      component.sidebarOpen = false;
      mockRouter.events.next('UNKNOWN_EVENT');
      tick(100);
      expect(component.sidebarOpen).toBe(false);
    }));

    it('should keep sidebar open when already open on resize >= 1024', () => {
      fixture.detectChanges();
      component.sidebarOpen = true;
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1200,
        configurable: true,
      });
      mockSettingsService.resize$.next();
      expect(component.sidebarOpen).toBe(true);
    });

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

    it('should show update modal on VersionReadyEvent', () => {
      const swUpdate = TestBed.inject(SwUpdate);
      jest.spyOn(swUpdate, 'isEnabled', 'get').mockReturnValue(true);
      const versionSubject = new Subject<{ type: string }>();
      Object.defineProperty(swUpdate, 'versionUpdates', {
        get: () => versionSubject,
        configurable: true,
      });

      fixture.detectChanges();
      versionSubject.next({ type: 'VERSION_READY' });
      expect(component.showUpdateModal).toBe(true);
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

  describe('refreshData', () => {
    it('should set refreshing and call marketService.refresh', () => {
      fixture.detectChanges();
      component.refreshData();
      expect(component.refreshing).toBe(true);
      expect(mockMarketService.refresh).toHaveBeenCalled();
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

    it('should fallback to mailto when Web Share API not available (canShare returns false)', async () => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => false,
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: jest.fn(),
        configurable: true,
      });
      const anchor = { href: '', click: jest.fn(), remove: jest.fn() };
      jest
        .spyOn(document, 'createElement')
        .mockReturnValue(anchor as unknown as HTMLElement);
      await component.share();
      expect(anchor.click).toHaveBeenCalled();
    });
  });

  describe('configureInstallModel', () => {
    it('should show install modal on iOS when standalone is true', () => {
      fixture.detectChanges();
      const platform = (component as unknown as Record<string, unknown>)
        .platform as Record<string, unknown>;
      platform.IOS = true;

      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      component['configureInstallModel']();

      expect(component.showInstallModal).toBe(true);
      expect(component.ios).toBe(true);

      delete (window.navigator as Record<string, unknown>).standalone;
    });

    it('should not show install modal on iOS when standalone not available', () => {
      fixture.detectChanges();
      const platform = (component as unknown as Record<string, unknown>)
        .platform as Record<string, unknown>;
      platform.IOS = true;

      component['configureInstallModel']();

      expect(component.showInstallModal).toBeUndefined();
      expect(component.ios).toBeUndefined();
    });

    it('should listen for beforeinstallprompt event', () => {
      let capturedCb: (e: object) => void = jest.fn();
      const origAddEventListener = window.addEventListener.bind(window);
      jest
        .spyOn(window, 'addEventListener')
        .mockImplementation((event: string, cb: any) => {
          if (event === 'beforeinstallprompt') {
            capturedCb = cb;
          }
          return origAddEventListener(event, cb);
        });
      component['configureInstallModel']();
      const mockEvent = { preventDefault: jest.fn() };
      capturedCb(mockEvent);
      expect(component.showInstallModal).toBe(true);
      expect(component['pwaInstallPromptEvent']).toBe(mockEvent);
    });
  });

  describe('public properties', () => {
    it('should expose Routes', () => {
      expect(component.Routes).toBeDefined();
    });

    it('should expose Status enum', () => {
      expect(component.Status).toBe(Status);
    });

    it('should expose appVersion', () => {
      expect(component.appVersion).toBeDefined();
    });
  });
});
