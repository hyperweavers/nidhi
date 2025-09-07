import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';

import { RefreshInterval, Settings, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  public settings$: Observable<Settings>;

  public readonly Theme = Theme;
  public readonly RefreshInterval = RefreshInterval;

  constructor(private readonly settingsService: SettingsService) {
    this.settings$ = this.settingsService.settings$;
  }

  public selectTheme(theme: Theme): void {
    this.settingsService.setTheme(theme);
  }

  public selectRefreshInterval(interval: RefreshInterval): void {
    this.settingsService.setRefreshInterval(interval);
  }
}
