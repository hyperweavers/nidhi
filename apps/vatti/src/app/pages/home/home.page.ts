import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

import { Constants } from '../../constants';

@Component({
  selector: 'app-home',
  imports: [RouterModule, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  public readonly Routes = Constants.routes;
}
