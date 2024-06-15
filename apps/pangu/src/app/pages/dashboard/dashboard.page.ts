import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { liveQuery } from 'dexie';

import { IndexCodes } from '../../models/market';
import { db } from '../../db/app.db';
import { MarketService } from '../../services/core/market.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  constructor(private marketService: MarketService) {
    // this.marketService.getStatus().subscribe(console.log);

    // this.marketService.getStockDetails('10960').subscribe(console.log);

    // this.marketService.getStock('10960').subscribe(console.log);

    // this.marketService.getIndex(IndexCodes.NIFTY_FIFTY).subscribe(console.log);

    // this.marketService.getStocks(['10960', '11984']).subscribe(console.log);

    // this.marketService
    //   .getIndices([IndexCodes.NIFTY_FIFTY, IndexCodes.SENSEX])
    //   .subscribe(console.log);

    // this.marketService.search('info').subscribe(console.log);

    liveQuery(() => db.stocks.toArray()).subscribe(console.log);
  }
}
