import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {
  SwUpdate,
  VersionEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { Platform } from '@angular/cdk/platform';
import { filter, map } from 'rxjs';
import { initFlowbite } from 'flowbite';

import { Constants } from './constants';

@Component({
  standalone: true,
  imports: [RouterModule, RouterLink],
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
    private cdr: ChangeDetectorRef
  ) {}

  public ngOnInit(): void {
    initFlowbite();

    this.updateOnlineStatus();

    window.addEventListener('online', this.updateOnlineStatus.bind(this));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.pipe(
        filter(
          (event: VersionEvent): event is VersionReadyEvent =>
            event.type === 'VERSION_READY'
        ),
        map(() => {
          this.showUpdateModal = true;
        })
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
