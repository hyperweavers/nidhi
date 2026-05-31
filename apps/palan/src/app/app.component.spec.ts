import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { LOGGER } from '@nidhi/shared-logger';
import { provideHttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { MarketService } from './services/core/market.service';
import { SettingsService } from './services/core/settings.service';
import { PlanService } from './services/core/plan.service';
import { Constants } from './constants';
import { MarketStatus, Status } from './models/market';

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
  let mockMarketService: { marketStatus$: Subject<MarketStatus>; refresh: jest.Mock };
  let mockPlanService: { plan$: Subject<unknown> };
  let mockRouter: MockRouter;

  beforeEach(async () => {
    mockRouter = new MockRouter();
    mockSettingsService = { resize$: new Subject<void>(), setTheme: jest.fn() };
    mockMarketService = {
      marketStatus$: new Subject<MarketStatus>(),
      refresh: jest.fn(),
    };
    mockPlanService = { plan$: new Subject<unknown>() };

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
        { provide: PlanService, useValue: mockPlanService },
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

    it('should navigate to plan when no plan and navigating to root', fakeAsync(() => {
      fixture.detectChanges();
      mockRouter.events.next(new NavigationStart(1, Constants.routes.ROOT));
      tick(100);
      expect(mockRouter.navigate).toHaveBeenCalledWith([Constants.routes.PLAN]);
    }));

    it('should navigate to plan when no plan and navigating to dashboard', fakeAsync(() => {
      fixture.detectChanges();
      mockRouter.events.next(
        new NavigationStart(1, '/' + Constants.routes.DASHBOARD),
      );
      tick(100);
      expect(mockRouter.navigate).toHaveBeenCalledWith([Constants.routes.PLAN]);
    }));

    it('should not navigate to plan on non-protected route', fakeAsync(() => {
      fixture.detectChanges();
      mockRouter.events.next(new NavigationStart(1, '/settings'));
      tick(100);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
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
  });

  describe('updateApp', () => {
    it('should set showUpdateModal to false', () => {
      component.showUpdateModal = true;
      component.updateApp();
      expect(component.showUpdateModal).toBe(false);
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
      (component as unknown as Record<string, unknown>).pwaInstallPromptEvent = {
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
      jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);
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
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('share failed'));
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
