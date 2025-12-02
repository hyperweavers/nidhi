import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { Kpi } from '../../models/kpi';
import { Direction } from '../../models/market';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly dashboardService = inject(DashboardService);

  public kpi$: Observable<Kpi>;

  public readonly Direction = Direction;

  constructor() {
    const dashboardService = this.dashboardService;

    this.kpi$ = dashboardService.kpi$;
  }
}
