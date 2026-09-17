import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_VERSION } from '../../../generated/version';
import { Constants } from '../../constants';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  protected readonly appVersion = APP_VERSION;
  protected readonly Routes = Constants.routes;
}
