import { Platform } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterModule,
} from '@angular/router';
import {
  SwUpdate,
  VersionEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { initFlowbite } from 'flowbite';
import { Observable, filter, map, tap } from 'rxjs';

import { Constants } from './constants';
import { MarketStatus, Status } from './models/market-status';
import { MarketService } from './services/core/market.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  public marketStatus$: Observable<MarketStatus>;

  public sidebarOpen?: boolean;
  public showUpdateModal?: boolean;
  public showInstallModal?: boolean;
  public ios?: boolean;
  public refreshing?: boolean;

  public readonly Routes = Constants.routes;
  public readonly Status = Status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pwaInstallPromptEvent?: any;

  constructor(
    private platform: Platform,
    private swUpdate: SwUpdate,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private marketService: MarketService,
  ) {
    this.marketStatus$ = this.marketService.marketStatus$.pipe(
      tap(() => (this.refreshing = false)),
    );
  }

  public ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        initFlowbite();
      }
    });

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.pipe(
        filter(
          (event: VersionEvent): event is VersionReadyEvent =>
            event.type === 'VERSION_READY',
        ),
        map(() => {
          this.showUpdateModal = true;
        }),
      );
    }

    this.configureInstallModel();

    this.detectSidebarState();
  }

  @HostListener('window:resize')
  detectSidebarState() {
    if (document.documentElement.clientWidth >= 1024 && !this.sidebarOpen) {
      this.sidebarOpen = true;
    } else {
      if (this.sidebarOpen) {
        this.sidebarOpen = false;
      }
    }
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
    if (document.documentElement.clientWidth >= 1024) {
      this.sidebarOpen = true;
      return;
    }

    this.sidebarOpen = !this.sidebarOpen;
  }

  public refreshData(): void {
    this.refreshing = true;

    this.marketService.refresh();
  }

  public async share(): Promise<void> {
    const shareData = {
      title: 'Pangu',
      text: "Hey there! I found this awesome app called Pangu. It is a privacy focused open source stock portfolio manager. I thought you might like it. Why don't you give a try?",
      url: document.location.origin,
    };
    let shared = false;

    if (
      navigator.canShare &&
      navigator.share &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error(err);
      } finally {
        shared = true;
      }
    }

    if (!shared) {
      const a = document.createElement('a');
      a.href = `mailto:?subject=Look%20at%20this%20awesome%20app%20-%20Pangu&body=${encodeURI(
        shareData.text + ' The app is available at ' + shareData.url,
      )}`;

      a.click();

      a.remove();
    }

    this.toggleSidebar();
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
