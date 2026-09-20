import { Platform } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterModule,
} from '@angular/router';
import {
  SwUpdate,
  VersionEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { LOGGER } from '@nidhi/shared-logger';
import { initFlowbite } from 'flowbite';
import { Observable, delay, filter, tap } from 'rxjs';

import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ToastComponent } from '@nidhi/shared-toast';
import { APP_VERSION } from '../generated/version';
import { CreateWatchListWizardComponent } from './components/create-watch-list-wizard/create-watch-list-wizard.component';
import { StockSearchComponent } from './components/stock-search/stock-search.component';
import { TransactionDrawerComponent } from './components/transaction-drawer/transaction-drawer.component';
import { Constants } from './constants';
import { Flowbite } from './decorators/flowbite.decorator';
import { MarketStatus, Status } from './models/market';
import { MarketService } from './services/core/market.service';
import { SettingsService } from './services/core/settings.service';
import { WatchListService } from './services/watch-list.service';

@Flowbite()
@UntilDestroy()
@Component({
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    StockSearchComponent,
    ToastComponent,
    CreateWatchListWizardComponent,
    TransactionDrawerComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly platform = inject(Platform);
  private readonly swUpdate = inject(SwUpdate);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly marketService = inject(MarketService);
  private readonly settingsService = inject(SettingsService);
  private readonly watchListService = inject(WatchListService);
  private readonly logger = inject(LOGGER);

  private readonly MEDIA_SIZE_LARGE = 1024;

  public marketStatus$: Observable<MarketStatus>;

  public sidebarOpen?: boolean;
  public showUpdateModal?: boolean;
  public showInstallModal?: boolean;
  public ios?: boolean;
  public refreshing?: boolean;
  public readonly mobileSearchOpen = signal(false);
  public readonly headerSearchQuery = signal('');
  public readonly showFabMenu = signal(false);
  public readonly showWizard = signal(false);

  public readonly appVersion = APP_VERSION;
  public readonly Routes = Constants.routes;
  public readonly Status = Status;
  public defaultWatchListId?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pwaInstallPromptEvent?: any;

  private readonly mainContent =
    viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly globalDrawerTrigger = viewChild<
    ElementRef<HTMLButtonElement>
  >('globalDrawerTrigger');

  constructor() {
    this.marketStatus$ = this.marketService.marketStatus$.pipe(
      tap(() => (this.refreshing = false)),
    );
  }

  public ngOnInit(): void {
    this.router.events.pipe(untilDestroyed(this)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.sidebarOpen = false;
        this.mainContent()?.nativeElement?.scrollTo({ top: 0 });
        this.closeMobileSearch();
        this.closeFabMenu();
      }
    });

    this.router.events
      .pipe(untilDestroyed(this), delay(100))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.mainContent()?.nativeElement?.scrollTo({ top: 0 });
          this.closeSidebar();
          this.closeFabMenu();
          initFlowbite();
        }
      });

    this.settingsService.resize$.pipe(untilDestroyed(this)).subscribe(() => {
      if (this.document.documentElement.clientWidth >= this.MEDIA_SIZE_LARGE) {
        if (!this.sidebarOpen) {
          this.sidebarOpen = true;
        }
        this.closeMobileSearch();
      } else {
        this.sidebarOpen = false;
      }

      this.cdr.markForCheck();
    });

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter(
            (event: VersionEvent): event is VersionReadyEvent =>
              event.type === 'VERSION_READY',
          ),
          untilDestroyed(this),
        )
        .subscribe(() => {
          this.showUpdateModal = true;

          this.cdr.markForCheck();
        });
    }

    this.configureInstallModel();

    this.watchListService
      .ensureDefaultWatchList()
      .then((id) => {
        this.defaultWatchListId = id;
      })
      .catch((error) => this.logger.captureException(error));
  }

  public updateApp(): void {
    this.showUpdateModal = false;

    window.location.reload();
  }

  public closeUpdateModal(): void {
    this.showUpdateModal = false;
  }

  public installApp(): void {
    this.pwaInstallPromptEvent?.prompt();

    this.showInstallModal = false;
  }

  public closeInstallModal(): void {
    this.showInstallModal = false;
  }

  public toggleSidebar(): void {
    if (this.document.documentElement.clientWidth >= this.MEDIA_SIZE_LARGE) {
      this.sidebarOpen = true;
      return;
    }

    this.sidebarOpen = !this.sidebarOpen;
  }

  public closeSidebar(): void {
    if (this.document.documentElement.clientWidth >= this.MEDIA_SIZE_LARGE) {
      return;
    }

    this.sidebarOpen = false;
    this.cdr.markForCheck();
  }

  public toggleFabMenu(): void {
    this.showFabMenu.update((v) => !v);
  }

  public closeFabMenu(): void {
    this.showFabMenu.set(false);
  }

  public openWizard(): void {
    this.showFabMenu.set(false);
    this.showWizard.set(true);
  }

  public closeWizard(): void {
    this.showWizard.set(false);
  }

  public onWizardCreated(id: string): void {
    this.showWizard.set(false);
    this.router.navigate(['/', Constants.routes.WATCH_LIST, id]);
  }

  public openScreenerEdit(): void {
    this.closeFabMenu();
    this.router.navigate(['/', Constants.routes.SCREENER, 'edit']);
  }

  public openGlobalTransactionDrawer(): void {
    this.closeFabMenu();
    // Opens through the hidden Flowbite trigger so the drawer uses the same
    // instance lifecycle as every other drawer in the app.
    this.globalDrawerTrigger()?.nativeElement.click();
  }

  public navigateToWatchList(): void {
    if (this.defaultWatchListId) {
      this.router.navigate([
        '/',
        Constants.routes.WATCH_LIST,
        this.defaultWatchListId,
      ]);
    } else {
      this.router.navigate(['/', Constants.routes.WATCH_LIST]);
    }
  }

  public refreshData(): void {
    this.refreshing = true;

    this.marketService.refresh();
  }

  public toggleMobileSearch(): void {
    this.mobileSearchOpen.update((v) => !v);
  }

  public closeMobileSearch(): void {
    this.mobileSearchOpen.set(false);
    this.headerSearchQuery.set('');
  }

  public async share(): Promise<void> {
    this.toggleSidebar();

    const shareData = {
      title: 'Pangu',
      text: "Hey there! I found this awesome app called Pangu. It is a privacy focused open source stock portfolio manager. I thought you might like it. Why don't you give a try?",
      url: this.document.location.origin,
    };
    let shared = false;

    if (
      navigator.canShare &&
      navigator.share &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        this.logger.error(
          `An error occurred while trying to share the app: ${error}`,
        );
      } finally {
        shared = true;
      }
    }

    if (!shared) {
      const a = this.document.createElement('a');
      a.href = `mailto:?subject=Look%20at%20this%20awesome%20app%20-%20Pangu&body=${encodeURI(
        shareData.text + ' The app is available at ' + shareData.url,
      )}`;

      a.click();

      a.remove();
    }
  }

  private configureInstallModel(): void {
    if (this.platform.IOS) {
      if ('standalone' in window.navigator && window.navigator.standalone) {
        this.showInstallModal = true;
        this.ios = true;
      }
    } else {
      window.addEventListener('beforeinstallprompt', (event: Event) => {
        event.preventDefault();

        this.showInstallModal = true;
        this.pwaInstallPromptEvent = event;

        this.cdr.markForCheck();
      });
    }
  }
}
