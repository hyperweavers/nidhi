import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Observable } from 'rxjs';

import {
  BanksInIndia,
  IbjaGoldRates,
  RbiPolicyRates,
} from '../../models/common';
import { PostOfficeSavingsSchemes } from '../../models/deposit';
import { DataService } from '../../services/core/data.service';

@UntilDestroy()
@Component({
  selector: 'app-post-office-savings-schemes',
  imports: [CommonModule],
  templateUrl: './post-office-savings-schemes.page.html',
  styleUrl: './post-office-savings-schemes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostOfficeSavingsSchemesPage {
  schemes$: Observable<PostOfficeSavingsSchemes>;
  repoRates$: Observable<RbiPolicyRates>;
  banksInIndia$: Observable<BanksInIndia>;
  goldRates$: Observable<IbjaGoldRates>;

  constructor(private dataService: DataService) {
    this.schemes$ = this.dataService.postOfficeSavingsSchemes$.pipe(
      untilDestroyed(this),
    );
    this.repoRates$ = this.dataService.rbiPolicyRates$.pipe(
      untilDestroyed(this),
    );
    this.banksInIndia$ = this.dataService.banksInIndia$.pipe(
      untilDestroyed(this),
    );
    this.goldRates$ = this.dataService.ibjaGoldRates$.pipe(
      untilDestroyed(this),
    );
  }
}
