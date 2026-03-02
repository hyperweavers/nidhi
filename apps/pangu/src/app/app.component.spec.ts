import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { Platform } from '@angular/cdk/platform';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { initFlowbite } from 'flowbite';
import { AppComponent } from './app.component';
import { Status } from './models/market';
import { MarketService } from './services/core/market.service';
import { SettingsService } from './services/core/settings.service';

jest.mock('flowbite', () => ({
  initFlowbite: jest.fn(),
}));

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockMarketService: any;
  let mockSettingsService: any;
  let resizeSubject: Subject<void>;
  let versionUpdatesSubject: Subject<VersionReadyEvent>;

  beforeEach(async () => {
    resizeSubject = new Subject<void>();
    versionUpdatesSubject = new Subject<VersionReadyEvent>();

    mockMarketService = {
      marketStatus$: new BehaviorSubject({
        status: Status.OPEN,
        tradingStartTime: '',
        tradingEndTime: '',
      }),
      refresh: jest.fn(),
    };

    mockSettingsService = {
      resize$: resizeSubject.asObservable(),
      settings$: new BehaviorSubject({
        theme: 'SYSTEM',
        colorScheme: 'DARK',
        refreshInterval: 5000,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: MarketService, useValue: mockMarketService },
        { provide: SettingsService, useValue: mockSettingsService },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdatesSubject.asObservable(),
          },
        },
        { provide: Platform, useValue: { IOS: false } },
      ],
    })
      .overrideComponent(AppComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have marketStatus$ observable', (done) => {
    component.marketStatus$.subscribe((status) => {
      expect(status.status).toBe(Status.OPEN);
      done();
    });
  });

  it('toggleSidebar should set sidebarOpen on large screens', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1200,
      configurable: true,
    });
    component.toggleSidebar();
    expect(component.sidebarOpen).toBe(true);
  });

  it('toggleSidebar should toggle on small screens', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 500,
      configurable: true,
    });
    component.sidebarOpen = false;
    component.toggleSidebar();
    expect(component.sidebarOpen).toBe(true);
    component.toggleSidebar();
    expect(component.sidebarOpen).toBe(false);
  });

  it('refreshData should set refreshing and call marketService.refresh', () => {
    component.refreshData();
    expect(component.refreshing).toBe(true);
    expect(mockMarketService.refresh).toHaveBeenCalled();
  });

  it('updateApp should set showUpdateModal to false', () => {
    component.showUpdateModal = true;
    // Don't try to redefine window.location; just test the modal state
    // The reload will be called but jsdom handles it gracefully
    component.updateApp();
    expect(component.showUpdateModal).toBe(false);
  });

  it('closeUpdateModal should set showUpdateModal to false', () => {
    component.showUpdateModal = true;
    component.closeUpdateModal();
    expect(component.showUpdateModal).toBe(false);
  });

  it('installApp should call prompt and close modal', () => {
    const mockPrompt = jest.fn();
    (component as any).pwaInstallPromptEvent = { prompt: mockPrompt };
    component.installApp();
    expect(mockPrompt).toHaveBeenCalled();
    expect(component.showInstallModal).toBe(false);
  });

  it('installApp should not crash with no pwaInstallPromptEvent', () => {
    (component as any).pwaInstallPromptEvent = undefined;
    expect(() => component.installApp()).not.toThrow();
    expect(component.showInstallModal).toBe(false);
  });

  it('closeInstallModal should set showInstallModal to false', () => {
    component.showInstallModal = true;
    component.closeInstallModal();
    expect(component.showInstallModal).toBe(false);
  });

  it('share should use navigator.share when available', async () => {
    const shareFn = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      value: jest.fn().mockReturnValue(true),
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: shareFn,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 500,
      configurable: true,
    });

    await component.share();
    expect(shareFn).toHaveBeenCalled();
  });

  it('share should fall back to mailto when navigator.share not available', async () => {
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 500,
      configurable: true,
    });

    await component.share();
    // Should not crash; mailto link created and clicked via DOM
  });

  it('share should handle navigator.share error', async () => {
    Object.defineProperty(navigator, 'canShare', {
      value: jest.fn().mockReturnValue(true),
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: jest.fn().mockRejectedValue(new Error('test')),
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 500,
      configurable: true,
    });

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await component.share();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('ngOnInit should handle resize for large and small screens', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1200,
      configurable: true,
    });
    component.sidebarOpen = false;
    resizeSubject.next();
    expect(component.sidebarOpen).toBe(true);

    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 500,
      configurable: true,
    });
    resizeSubject.next();
    expect(component.sidebarOpen).toBe(false);
  });

  it('should expose Routes and Status', () => {
    expect(component.Routes).toBeDefined();
    expect(component.Status).toBe(Status);
  });

  describe('PWA Installation', () => {
    it('should show install modal on iOS when not standalone', () => {
      // Re-initialize for iOS
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AppComponent],
        providers: [
          provideRouter([]),
          { provide: MarketService, useValue: mockMarketService },
          { provide: SettingsService, useValue: mockSettingsService },
          {
            provide: SwUpdate,
            useValue: { isEnabled: false, versionUpdates: of() },
          },
          { provide: Platform, useValue: { IOS: true, SAFARI: true } },
        ],
      })
        .overrideComponent(AppComponent, { set: { template: '' } })
        .compileComponents();

      Object.defineProperty(window.navigator, 'standalone', {
        get: () => false,
        configurable: true,
        enumerable: true,
      });

      const iosFixture = TestBed.createComponent(AppComponent);
      const iosComponent = iosFixture.componentInstance;

      (iosComponent as any).configureInstallModel();
      expect(iosComponent.showInstallModal).toBe(true);
      expect(iosComponent.ios).toBe(true);
    });

    it('should not show install modal on iOS when already standalone', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AppComponent],
        providers: [
          provideRouter([]),
          { provide: MarketService, useValue: mockMarketService },
          { provide: SettingsService, useValue: mockSettingsService },
          {
            provide: SwUpdate,
            useValue: { isEnabled: false, versionUpdates: of() },
          },
          { provide: Platform, useValue: { IOS: true, SAFARI: true } },
        ],
      })
        .overrideComponent(AppComponent, { set: { template: '' } })
        .compileComponents();

      Object.defineProperty(window.navigator, 'standalone', {
        get: () => true,
        configurable: true,
        enumerable: true,
      });

      const iosFixture = TestBed.createComponent(AppComponent);
      const iosComponent = iosFixture.componentInstance;

      (iosComponent as any).configureInstallModel();
      expect(iosComponent.showInstallModal).toBeFalsy();
    });

    it('should handle beforeinstallprompt event on non-iOS', () => {
      const event = new Event('beforeinstallprompt');
      (event as any).preventDefault = jest.fn();

      window.dispatchEvent(event);

      expect(component.showInstallModal).toBe(true);
      expect((component as any).pwaInstallPromptEvent).toBe(event);
      expect((event as any).preventDefault).toHaveBeenCalled();
    });

    it('should handle NavigationEnd event', fakeAsync(() => {
      const router = TestBed.inject(Router);
      (router.events as any).next(new NavigationEnd(1, '/', '/'));
      tick(150);
      expect(initFlowbite).toHaveBeenCalled();
    }));

    it('should handle SwUpdate VERSION_READY event', fakeAsync(() => {
      versionUpdatesSubject.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'a' },
        latestVersion: { hash: 'b' },
      });
      tick();
      expect(component.showUpdateModal).toBe(true);
    }));
  });
});
