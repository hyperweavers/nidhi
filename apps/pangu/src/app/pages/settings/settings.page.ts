import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Settings, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  public settings$: Observable<Settings>;

  public readonly Theme = Theme;

  constructor(private settingsService: SettingsService) {
    this.settings$ = this.settingsService.settings$;
  }

  public selectTheme(theme: Theme): void {
    this.settingsService.setTheme(theme);
  }
}
