import { CommonModule, DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ChartType } from '../../models/chart';
import { CompoundingFrequency } from '../../models/deposit';
import { ChartUtils } from '../../utils/chart.utils';
import { DateUtils } from '../../utils/date.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  YEARLY_ACCUMULATION_SCHEDULE,
  INTEREST_ACCUMULATION_OR_PAYOUT_SCHEDULE,
}

enum Charts {
  EARNINGS,
  YEARLY_SUMMARY,
  PAYOUT_SCHEDULE,
}

interface YearlySummary {
  year: number;
  openingBalance: number;
  amountDeposited: number;
  interestEarned: number;
  closingBalance: number;
}

@Component({
  selector: 'app-recurring-deposit-calculator',
  templateUrl: './recurring-deposit-calculator.page.html',
  styleUrls: ['./recurring-deposit-calculator.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [DecimalPipe, DatePipe],
})
export class RecurringDepositCalculatorPage implements OnInit {
  @ViewChild('investmentStartDateInput', { static: true })
  private investmentStartDateInput?: ElementRef;
  @ViewChild('earningsChart', { read: BaseChartDirective })
  private earningsChart!: BaseChartDirective;
  @ViewChild('yearlySummaryChart', { read: BaseChartDirective })
  private yearlySummaryChart!: BaseChartDirective;
  @ViewChild('yearlySummaryChartContainer')
  private yearlySummaryChartContainer?: ElementRef;

  readonly pageSize = 12; // Not strictly needed if you won't be paginating anything anymore

  readonly ChartType = ChartType;
  readonly Tabs = Tabs;
  readonly Charts = Charts;

  compoundingFrequencyValues = Object.values(CompoundingFrequency);

  // Instead of a single lump-sum deposit, use a monthlyDeposit
  monthlyDeposit = 2000;
  annualInterestRate = 7;

  depositTermYears = 5;
  depositTermMonths = 0;
  // depositTermDays = 0;

  totalDeposit = 0;
  interestEarned = 0;
  maturityAmount = 0;

  // Always pay interest at maturity for a recurring deposit
  // so no need to store user-selected payout type
  // or any related logic
  compoundingFrequency: CompoundingFrequency = CompoundingFrequency.Quarterly; // You could allow user selection, or fix this
  investmentStartDate: Date = new Date();
  maturityDate: Date | null = null;

  // This will hold the per-year breakdown of how the savings grow
  yearlySummary: YearlySummary[] = [];

  activeTab: Tabs = Tabs.YEARLY_ACCUMULATION_SCHEDULE;

  isChartInFullscreen = false;

  depositChartData: ChartData<ChartType.DOUGHNUT, number[], string | string[]> =
    {
      labels: ['Deposits', 'Interest'],
      datasets: ChartUtils.doughnutChartDualDatasets,
    };

  depositChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    ChartUtils.getDoughnutChartOptions((context): string => {
      return this.decimalPipe.transform(context.parsed, '1.0-0') || '';
    });

  yearlySummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.barChartPrimaryDataset,
        label: 'Year-End Balance',
      },
      {
        ...ChartUtils.barChartSecondaryDataset,
        label: 'Yearly Interest',
      },
    ],
  };

  yearlySummaryChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Year',
      'Amount',
      true,
      true,
      (context): string => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;
        return label && value
          ? `${label}: ${this.decimalPipe.transform(value, '1.0-0') || ''}`
          : '';
      },
      (tooltipItems): string => {
        return tooltipItems[0]?.label ? `Year: ${tooltipItems[0].label}` : '';
      },
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly cdr: ChangeDetectorRef,
    private readonly decimalPipe: DecimalPipe,
    private readonly datePipe: DatePipe,
  ) {}

  ngOnInit() {
    this.initDatePicker();
    this.calculateMaturityAmount();
  }

  @HostListener('window:fullscreenchange')
  onFullscreenChange() {
    if (this.document.fullscreenElement) {
      this.isChartInFullscreen = true;
    } else {
      this.isChartInFullscreen = false;
    }
  }

  onInvestmentStartDateChange(dateString: string) {
    this.investmentStartDate = new Date(dateString);
    this.calculateMaturityAmount();
  }

  onTabChange(tab: Tabs) {
    this.activeTab = Number(tab);
  }

  toggleFullscreen(chart: Charts) {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen();
    } else {
      let container: ElementRef | undefined;

      switch (chart) {
        case Charts.YEARLY_SUMMARY:
          container = this.yearlySummaryChartContainer;
          break;

        // case Charts.PAYOUT_SCHEDULE:
        //   container = this.payoutScheduleChartContainer;
        //   break;

        case Charts.EARNINGS:
        default:
          return;
      }

      if (container) {
        container.nativeElement
          .requestFullscreen()
          .then(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (screen.orientation as any)
              .lock('landscape')
              .catch((error: Error) => {
                console.error(
                  `An error occurred while trying to lock screen orientation to landscape: ${error.message} (${error.name})`,
                );
              });

            this.cdr.markForCheck();
          })
          .catch((error: Error) => {
            console.error(
              `An error occurred while trying to switch into fullscreen mode: ${error.message} (${error.name})`,
            );
          });
      }
    }
  }

  calculateMaturityAmount() {
    // Reset if invalid input
    const timeInYears = DateUtils.convertDepositTermToYears(
      this.depositTermYears,
      this.depositTermMonths,
    );

    if (timeInYears <= 0) {
      this.maturityAmount = 0;
      this.interestEarned = 0;
      this.maturityDate = null;
      this.yearlySummary = [];
      this.updateChartData();
      return;
    }

    // Calculate our final maturity date
    this.maturityDate = DateUtils.getDepositMaturityDate(
      this.investmentStartDate,
      this.depositTermYears,
      this.depositTermMonths,
    );

    // Convert annual interest rate to a fraction
    // Example: 7 -> 0.07
    const annualRate = this.annualInterestRate / 100;

    // Determine compounding frequency (n) based on the enum
    // e.g., 12 for monthly, 4 for quarterly, etc.
    const freq = DateUtils.convertFrequencyToValue(this.compoundingFrequency);

    // Calculate total number of periods for the given term
    // (freq * number of years).
    // For instance, if freq=12 and depositTermYears=5, n=60
    const n = freq * this.depositTermYears;

    // Compute the periodic interest i (annualRate / freq):
    const i = annualRate / freq;

    // Apply the formula:
    // M = R * ( (1 + i)^n - 1 ) / ( 1 - (1 + i)^(-1/3) )
    // R = monthlyDeposit in this example
    const numerator = Math.pow(1 + i, n) - 1;
    const denominator = 1 - Math.pow(1 + i, -1 / 3);
    this.maturityAmount = this.monthlyDeposit * (numerator / denominator);

    // For a recurring deposit, total deposits = monthlyDeposit * (12 * depositTermYears)
    this.totalDeposit = this.monthlyDeposit * this.depositTermYears * 12;

    // Finally, total interest is M - total deposits
    this.interestEarned = this.maturityAmount - this.totalDeposit;

    // If the tenure is more than 1 year, you can still generate a year-by-year summary
    if (timeInYears >= 1) {
      this.generateYearlySummary();
    } else {
      this.yearlySummary = [];
    }

    this.updateChartData();
  }

  private generateYearlySummary(): void {
    this.yearlySummary = [];

    // Include partial months as fractional years
    const depositTermInYears =
      this.depositTermYears + this.depositTermMonths / 12;

    // Convert annual interest to a fraction (e.g., 7 -> 0.07)
    const annualRate = this.annualInterestRate / 100;

    // Determine the compounding frequency (times per year), // e.g. 12 for monthly, 4 for quarterly, etc.
    const freq = DateUtils.convertFrequencyToValue(this.compoundingFrequency);

    // Periodic rate (i)
    const i = annualRate / freq;

    // Keep track of the results from the previous iteration
    let prevMaturityValue = 0;
    let prevDeposited = 0;

    // ----------------------------------------------------------------------------
    // calculateYearlySegment
    // ----------------------------------------------------------------------------
    // Internal helper to compute an RD snapshot at a certain “yearFraction” // (which may be an integer or partial).
    const calculateYearlySegment = (
      yearFraction: number,
      isPartial = false,
    ): void => {
      // How many total compounding periods have elapsed up to this fraction // e.g., if freq=4 and yearFraction=2.5 => n=10
      const n = freq * yearFraction;

      // Apply the same formula you use in calculateMaturityAmount():
      // M = R * ( (1 + i)^n - 1 ) / ( 1 - (1 + i)^(-1/3) )
      // with R = monthlyDeposit
      const numerator = Math.pow(1 + i, n) - 1;
      const denominator = 1 - Math.pow(1 + i, -1 / 3);
      const maturityValue = this.monthlyDeposit * (numerator / denominator);

      // Total deposits up to this point (yearFraction may be partial)
      // For a purely monthly deposit, multiply monthlyDeposit * (12 * yearFraction).
      // Round down only if you want partial months to be exact.
      const totalDeposited = this.monthlyDeposit * 12 * yearFraction;

      // Interest up to this point
      const totalInterest = maturityValue - totalDeposited;

      // Interest earned in this particular segment
      const interestThisYear =
        totalInterest - (prevMaturityValue - prevDeposited);

      // Amount deposited in this segment (year or partial-year)
      const depositThisYear = totalDeposited - prevDeposited;

      // Opening balance is the maturity value from the previous snapshot
      const openingBalance = prevMaturityValue;
      // New closing balance at this snapshot
      const closingBalance = maturityValue;

      // Build the summary entry
      this.yearlySummary.push({
        // If partial leftover, you could label it “Year 5.4” or similar
        year: isPartial ? Math.round(yearFraction * 100) / 100 : yearFraction,
        openingBalance,
        amountDeposited: depositThisYear,
        interestEarned: interestThisYear,
        closingBalance,
      });

      // Update “previous” trackers
      prevMaturityValue = maturityValue;
      prevDeposited = totalDeposited;
    };

    // Loop year by year, and handle any leftover partial year
    let currentYear = 1;
    while (currentYear <= Math.floor(depositTermInYears)) {
      calculateYearlySegment(currentYear);
      currentYear++;
    }

    // If there is a leftover fraction of a year, handle that partial portion
    const leftover = depositTermInYears - Math.floor(depositTermInYears);
    if (leftover > 0) {
      // We treat partial leftover as (full years + leftover part)
      const partialSegment = Math.floor(depositTermInYears) + leftover;
      calculateYearlySegment(partialSegment, true);
    }

    this.updateYearlySummaryChartData();
  }

  // Update chart data for the final ring chart
  private updateChartData() {
    this.depositChartData.datasets[0].data = [
      Math.floor(this.totalDeposit),
      Math.floor(this.interestEarned),
    ];
    if (this.earningsChart) {
      this.earningsChart.update();
    }
  }

  private updateYearlySummaryChartData() {
    this.yearlySummaryChartData.labels = this.yearlySummary.map(
      (item) => item.year,
    );
    this.yearlySummaryChartData.datasets[0].data = this.yearlySummary.map(
      (item) => item.closingBalance,
    );
    this.yearlySummaryChartData.datasets[1].data = this.yearlySummary.map(
      (item) => item.interestEarned,
    );

    if (this.yearlySummaryChart) {
      this.yearlySummaryChart.update();
    }
  }

  private resetDatepicker() {
    this.datepicker?.setDate(Date.now(), { clear: true });
  }

  private initDatePicker() {
    if (this.investmentStartDateInput) {
      this.datepicker = new Datepicker(
        this.investmentStartDateInput.nativeElement,
        {
          autohide: true,
          format: 'dd/mm/yyyy',
          todayBtn: true,
          clearBtn: true,
          todayBtnMode: 1,
          todayHighlight: true,
        },
      );

      this.investmentStartDateInput.nativeElement.addEventListener(
        'changeDate',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const dateFragments = e.target.value.split('/');
          this.investmentStartDate = new Date(
            `${dateFragments[2]}/${dateFragments[1]}/${dateFragments[0]}`,
          );

          this.calculateMaturityAmount();
        },
      );

      this.resetDatepicker();
    }
  }
}
