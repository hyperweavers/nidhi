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
import { CompoundingFrequency, InterestPayoutType } from '../../models/deposit';
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

interface Schedule {
  date: Date;
  interestAmount: number;
}

interface YearlySummary {
  year: number;
  openingBalance: number;
  interestEarned: number;
  closingBalance: number;
}

@Component({
  selector: 'app-fixed-deposit-calculator',
  templateUrl: './fixed-deposit-calculator.page.html',
  styleUrls: ['./fixed-deposit-calculator.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [DecimalPipe, DatePipe],
})
export class FixedDepositCalculatorPage implements OnInit {
  @ViewChild('investmentStartDateInput', { static: true })
  private investmentStartDateInput?: ElementRef;
  @ViewChild('earningsChart', { read: BaseChartDirective })
  earningsChart!: BaseChartDirective;
  @ViewChild('yearlySummaryChart', { read: BaseChartDirective })
  yearlySummaryChart!: BaseChartDirective;
  @ViewChild('payoutScheduleChart', { read: BaseChartDirective })
  payoutScheduleChart!: BaseChartDirective;
  @ViewChild('yearlySummaryChartContainer')
  private yearlySummaryChartContainer?: ElementRef;
  @ViewChild('payoutScheduleChartContainer')
  private payoutScheduleChartContainer?: ElementRef;

  readonly pageSize = 12;

  readonly InterestPayoutType = InterestPayoutType;
  readonly ChartType = ChartType;
  readonly Tabs = Tabs;
  readonly Charts = Charts;

  private interestPayoutTypeValues = Object.values(InterestPayoutType);
  compoundingFrequencyValues = Object.values(CompoundingFrequency).slice(1); // Exclude None

  depositAmount = 100000;
  annualInterestRate = 7;

  depositTermYears = 5;
  depositTermMonths = 0;
  depositTermDays = 0;

  maturityAmount = 0;
  interestEarned = 0;

  interestPayoutType: InterestPayoutType = InterestPayoutType.Maturity; // Default to maturity
  compoundingFrequency: CompoundingFrequency = CompoundingFrequency.Quarterly; // Default to quarterly

  investmentStartDate: Date = new Date(); // Default to today's date
  maturityDate: Date | null = null; // Initialize as null

  payoutSchedulePage = 0;

  payoutSchedule: Schedule[] = [];
  yearlySummary: YearlySummary[] = [];

  activeTab: Tabs = Tabs.YEARLY_ACCUMULATION_SCHEDULE;

  isChartInFullscreen = false;

  depositChartData: ChartData<ChartType.DOUGHNUT, number[], string | string[]> =
    {
      labels: ['Principal', 'Interest'],
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

  payoutScheduleChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.barChartSecondaryDataset,
        label: 'Interest',
      },
    ],
  };

  payoutScheduleChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Month',
      'Interest',
      false,
      true,
      (context): string => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;

        return label && value
          ? `${label}: ${this.decimalPipe.transform(value, '1.0-0') || ''}`
          : '';
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

  onCompoundingFrequencyChange() {
    const availablePayoutTypes = this.getAvailableInterestPayoutTypes();
    if (!availablePayoutTypes.includes(this.interestPayoutType)) {
      this.interestPayoutType = InterestPayoutType.Maturity;
    }
    this.calculateMaturityAmount();
  }

  onInterestPayoutTypeChange() {
    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      this.activeTab = Tabs.YEARLY_ACCUMULATION_SCHEDULE;
    } else {
      this.activeTab = Tabs.INTEREST_ACCUMULATION_OR_PAYOUT_SCHEDULE;
    }

    this.calculateMaturityAmount();
  }

  getAvailableInterestPayoutTypes(): InterestPayoutType[] {
    const compoundingValue = DateUtils.convertFrequencyToValue(
      this.compoundingFrequency,
    );
    return this.interestPayoutTypeValues.filter((payoutType) => {
      const payoutValue = DateUtils.convertFrequencyToValue(payoutType);
      return (
        payoutValue <= compoundingValue ||
        payoutType === InterestPayoutType.Maturity
      );
    });
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

        case Charts.PAYOUT_SCHEDULE:
          container = this.payoutScheduleChartContainer;
          break;

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
    const principal = this.depositAmount;

    // Convert deposit term to years
    const timeInYears = DateUtils.convertDepositTermToYears(
      this.depositTermYears,
      this.depositTermMonths,
      this.depositTermDays,
    );

    if (timeInYears <= 0 || !this.investmentStartDate) {
      // Reset values if invalid input
      this.maturityAmount = 0;
      this.interestEarned = 0;
      this.maturityDate = null;
      this.payoutSchedule = [];
      return;
    }

    // Calculate maturity date
    this.maturityDate = DateUtils.getDepositMaturityDate(
      this.investmentStartDate,
      this.depositTermYears,
      this.depositTermMonths,
      this.depositTermDays,
    );

    // Generate the payout schedule
    this.generatePayoutSchedule();

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      // Ensure the schedule has just been generated
      if (this.payoutSchedule.length > 0) {
        const lastEntry = this.payoutSchedule[this.payoutSchedule.length - 1];
        // The schedule’s lastEntry.interestAmount is the accumulated interest so far
        const accumulatedInterest = lastEntry.interestAmount;
        this.maturityAmount = principal + accumulatedInterest;
        this.interestEarned = accumulatedInterest;
      } else {
        // Fallback if somehow there is no payout schedule
        this.maturityAmount = principal;
        this.interestEarned = 0;
      }
    } else {
      // The existing block for monthly/quarterly payouts remains as is
      this.maturityAmount = principal;
      this.interestEarned = this.payoutSchedule.reduce(
        (total, payout) => total + payout.interestAmount,
        0,
      );
    }

    // If the total tenure is more than 1 year, generate the yearly summary
    if (
      this.interestPayoutType === InterestPayoutType.Maturity &&
      timeInYears > 1
    ) {
      this.generateYearlySummary();
    } else {
      this.yearlySummary = [];
    }

    // Update the chart data
    this.updateChartData();
  }

  private generatePayoutSchedule() {
    this.payoutSchedule = [];
    const principal = this.depositAmount;
    const annualRate = this.annualInterestRate / 100;

    // Ensure maturity date is calculated
    if (!this.maturityDate) {
      this.maturityDate = DateUtils.getDepositMaturityDate(
        this.investmentStartDate,
        this.depositTermYears,
        this.depositTermMonths,
        this.depositTermDays,
      );
    }

    const maturityDate = new Date(this.maturityDate);
    let currentDate = new Date(this.investmentStartDate);

    let frequency;
    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      frequency = this.compoundingFrequency;
    } else {
      frequency = this.interestPayoutType;
    }

    while (currentDate < maturityDate) {
      // Pick the next compounding or payout date
      let nextDate: Date;

      if (
        frequency === InterestPayoutType.Monthly ||
        frequency === CompoundingFrequency.Monthly
      ) {
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (
        frequency === InterestPayoutType.Quarterly ||
        frequency === CompoundingFrequency.Quarterly
      ) {
        nextDate = DateUtils.getNextFinancialQuarterEndDate(currentDate);
      } else {
        // Default to yearly compounding schedule
        nextDate = DateUtils.getNextCompoundingDate(
          currentDate,
          frequency as CompoundingFrequency,
        );
      }

      // Ensure nextDate does not exceed maturityDate
      if (nextDate > maturityDate) {
        nextDate = new Date(maturityDate);
      }

      // Start interest from the day after currentDate
      const interestStartDate = new Date(currentDate);
      interestStartDate.setDate(interestStartDate.getDate() + 1);

      // If the start date is already at or beyond nextDate, skip just this iteration
      if (interestStartDate >= nextDate) {
        currentDate = nextDate;
        // Move on
        continue;
      }

      // Calculate how many days in this segment
      const daysInPeriod = DateUtils.getDifferenceInDays(
        nextDate,
        interestStartDate,
      );

      if (this.interestPayoutType === InterestPayoutType.Maturity) {
        // For "Maturity", track total compound accumulation since the day after the initial deposit
        const totalDays = DateUtils.getDifferenceInDays(
          nextDate,
          new Date(this.investmentStartDate.getTime() + 24 * 60 * 60 * 1000),
        );

        // Number of compounding periods per year
        const n = DateUtils.convertFrequencyToValue(this.compoundingFrequency);

        // Compound from the day after the deposit start
        const accumulatedAmount =
          principal * Math.pow(1 + annualRate / n, (n * totalDays) / 365);

        const interestAccumulated = accumulatedAmount - principal;
        this.payoutSchedule.push({
          date: new Date(nextDate),
          interestAmount: interestAccumulated,
        });
      } else {
        // For monthly or quarterly payouts, do pro‐rata interest
        const interestAmount = (principal * annualRate * daysInPeriod) / 365;
        this.payoutSchedule.push({
          date: new Date(nextDate),
          interestAmount: interestAmount,
        });
      }

      if (nextDate >= maturityDate) {
        break;
      }

      currentDate = nextDate;
    }

    this.updatePayoutScheduleChart();
  }

  private generateYearlySummary() {
    this.yearlySummary = [];

    // Make sure the payout schedule is up to date
    if (this.payoutSchedule.length === 0) {
      this.generatePayoutSchedule();
    }

    // Sort the payout schedule by date (in case it isn’t already)
    this.payoutSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Track a running principal if interest is reinvested (Maturity mode)
    // or a fixed principal if interest is not reinvested (Monthly/Quarterly).
    let runningBalance = this.depositAmount;
    // Store data for each calendar year, then push to yearlySummary once
    // a year boundary crossed.
    let currentYear = this.investmentStartDate.getFullYear();
    let openingBalance = runningBalance;
    let interestAccumulatedThisYear = 0;

    // Helper to finalize a year’s summary (when the next payout crosses into a new year)
    const finalizeYear = () => {
      this.yearlySummary.push({
        year: currentYear,
        openingBalance: openingBalance,
        interestEarned: interestAccumulatedThisYear,
        closingBalance: runningBalance,
      });
    };

    // Iterate over each payout in the schedule
    for (const payout of this.payoutSchedule) {
      const payoutYear = payout.date.getFullYear();

      // While moving into a new year, finalize the old year, then reset
      while (payoutYear > currentYear) {
        finalizeYear();
        currentYear++;
        openingBalance = runningBalance;
        interestAccumulatedThisYear = 0;
      }

      // If interest is retained (Maturity mode), update running balance
      // If interest is paid out monthly/quarterly (not reinvested),
      // then the principal doesn’t grow through the year.
      if (this.interestPayoutType === InterestPayoutType.Maturity) {
        runningBalance = this.depositAmount + payout.interestAmount;
      }

      // Track interest earned this year
      interestAccumulatedThisYear = payout.interestAmount;
    }

    // At the end, finalize the last partial year
    finalizeYear();

    // Update the chart data
    this.updateYearlySummaryChartData();
  }

  // Update chart data
  private updateChartData() {
    this.depositChartData.datasets[0].data = [
      Math.floor(this.depositAmount),
      Math.floor(this.interestEarned),
    ];

    // Refresh the chart
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

    // Refresh the chart if needed
    if (this.yearlySummaryChart) {
      this.yearlySummaryChart.update();
    }
  }

  private updatePayoutScheduleChart() {
    const labels = this.payoutSchedule.map((payout) =>
      this.datePipe.transform(payout.date, 'MMM yy'),
    );
    const payoutData = this.payoutSchedule.map(
      (payout) => payout.interestAmount,
    );

    this.payoutScheduleChartData.labels = labels;
    this.payoutScheduleChartData.datasets[0].data = payoutData;

    // Refresh the chart
    if (this.payoutScheduleChart) {
      this.payoutScheduleChart.update();
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
