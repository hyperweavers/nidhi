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
import { filter, map } from 'rxjs';

import { Constants } from './constants';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  public darkTheme?: boolean;
  public sidebarOpen?: boolean;
  public online?: boolean;
  public showUpdateModal?: boolean;
  public showInstallModal?: boolean;
  public isIos?: boolean;

  public readonly routes = Constants.routes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pwaInstallPromptEvent?: any;

  constructor(
    private platform: Platform,
    private swUpdate: SwUpdate,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  public ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        initFlowbite();
      }
    });

    this.updateOnlineStatus();

    window.addEventListener('online', this.updateOnlineStatus.bind(this));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));

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

    this.detectTheme();

    this.detectSidebarState();
  }

  @HostListener('window:resize')
  detectSidebarState() {
    if (document.documentElement.clientWidth >= 1024 && !this.sidebarOpen) {
      this.sidebarOpen = true;
    } else {
      this.sidebarOpen = false;
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

  public toggleTheme(): void {
    this.darkTheme = !this.darkTheme;

    document.documentElement.classList.toggle('dark');

    localStorage.setItem('dark-theme', String(this.darkTheme));
  }

  public toggleSidebar(): void {
    if (document.documentElement.clientWidth >= 1024) {
      this.sidebarOpen = true;
      return;
    }

    this.sidebarOpen = !this.sidebarOpen;
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

        shared = true;
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

  private detectTheme(): void {
    const preferredTheme = localStorage.getItem('dark-theme');

    if (!preferredTheme) {
      if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        this.darkTheme = true;

        document.documentElement.classList.add('dark');
      }
    } else {
      if (preferredTheme === String(true)) {
        this.darkTheme = true;

        document.documentElement.classList.add('dark');
      }
    }
  }

  private updateOnlineStatus(): void {
    this.online = window.navigator.onLine;

    this.cdr.markForCheck();
  }

  private configureInstallModel(): void {
    if (this.platform.IOS) {
      if ('standalone' in window.navigator && window.navigator.standalone) {
        this.showInstallModal = true;
        this.isIos = true;
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
