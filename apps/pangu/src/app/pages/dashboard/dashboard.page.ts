import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';

import { Constants } from '../../constants';
import { IndexCodes } from '../../models/market';
import { Index } from '../../models/index';
import { Direction } from '../../models/stock';
import { Portfolio } from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { PortfolioService } from '../../services/portfolio.service';

interface Kpi {
  indices: Index[];
  portfolio: Portfolio;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  public kpi$: Observable<Kpi>;

  private indices$: Observable<Index[]>;
  private portfolio$: Observable<Portfolio>;

  public readonly routes = Constants.routes;
  public readonly Direction = Direction;

  constructor(
    private marketService: MarketService,
    private portfolioService: PortfolioService
  ) {
    this.indices$ = this.marketService.getIndices([
      IndexCodes.NIFTY_FIFTY,
      IndexCodes.SENSEX,
    ]);

    this.portfolio$ = this.portfolioService.portfolio$;

    this.kpi$ = combineLatest([this.indices$, this.portfolio$]).pipe(
      map(([indices, portfolio]) => ({
        indices,
        portfolio,
      }))
    );
  }
}
