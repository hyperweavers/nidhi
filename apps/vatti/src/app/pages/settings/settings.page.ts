import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Settings, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);

  public settings$: Observable<Settings>;

  public readonly Theme = Theme;

  constructor() {
    this.settings$ = this.settingsService.settings$;
  }

  public selectTheme(theme: Theme): void {
    this.settingsService.setTheme(theme);
  }
}
