import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ChartType } from '../../models/chart';
import { DataService } from '../../services/core/data.service';
import { ChartUtils } from '../../utils/chart.utils';

@UntilDestroy()
@Component({
  selector: 'app-gold-jewellery-price-calculator',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './gold-jewellery-price-calculator.page.html',
  styleUrl: './gold-jewellery-price-calculator.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DataService, DecimalPipe],
})
export class GoldJewelleryPriceCalculatorPage {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  private readonly GSTPercentage = 3; // 3% GST rate

  readonly ChartType = ChartType;

  goldWeight = 1;
  wastagePercentage = 8;
  makingCharge = 0;
  goldPricePerGram = 0;

  goldPrice = 0;
  wastageValue = 0;
  tax = 0;
  totalAmountPayable = 0;

  showPriceLoading = true;

  // Chart Data
  priceBreakdownChartData: ChartData<
    ChartType.DOUGHNUT,
    number[],
    string | string[]
  > = {
    labels: ['Gold', 'W/VA', 'MC', 'Tax'],
    datasets: [
      {
        ...ChartUtils.defaultDoughnutChartDataset,
        ...ChartUtils.getDoughnutChartColors([
          ChartUtils.colorGreen,
          ChartUtils.colorYellow,
          ChartUtils.colorPurple,
          ChartUtils.colorBlue,
        ]),
      },
    ],
  };

  priceBreakdownChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    ChartUtils.getDoughnutChartOptions((context) => {
      return this.decimalPipe.transform(context.parsed, '1.0-0') || '';
    });

  constructor(
    private readonly decimalPipe: DecimalPipe,
    dataService: DataService,
    cdr: ChangeDetectorRef,
  ) {
    dataService.goldRate$.pipe(untilDestroyed(this)).subscribe((price) => {
      this.goldPricePerGram = price;
      this.calculateTotalPrice();
      this.showPriceLoading = false;
      cdr.markForCheck();
    });
  }

  calculateTotalPrice() {
    this.goldPrice = this.goldWeight * this.goldPricePerGram;
    this.wastageValue =
      this.goldWeight * (this.wastagePercentage / 100) * this.goldPricePerGram;
    const subtotal = this.goldPrice + this.wastageValue + this.makingCharge;
    this.tax = (subtotal * this.GSTPercentage) / 100;
    this.totalAmountPayable = subtotal + this.tax;

    // Update chart data
    this.priceBreakdownChartData.datasets[0].data = [
      this.goldPrice,
      this.wastageValue,
      this.makingCharge,
      this.tax,
    ];

    // Refresh the chart
    if (this.chart) {
      this.chart.update();
    }
  }
}
