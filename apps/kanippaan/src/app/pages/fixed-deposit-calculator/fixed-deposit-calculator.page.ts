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

import {
  barChartPrimaryDataset,
  barChartSecondaryDataset,
  ChartType,
  getBarChartOptions,
  getDoughnutChartOptions,
  principalInterestDoughnutChartDatasets,
} from '../../utils/chart.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum InterestPayoutType {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Maturity = 'Maturity',
}

enum CompoundingFrequency {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  HalfYearly = 'Half Yearly',
  Yearly = 'Yearly',
}

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
  compoundingFrequencyValues = Object.values(CompoundingFrequency);

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
      datasets: principalInterestDoughnutChartDatasets,
    };

  depositChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    getDoughnutChartOptions((context): string => {
      return this.decimalPipe.transform(context.parsed, '1.0-0') || '';
    });

  yearlySummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...barChartPrimaryDataset,
        label: 'Interest',
      },
      {
        ...barChartSecondaryDataset,
        label: 'Balance',
      },
    ],
  };

  yearlySummaryChartOptions: ChartConfiguration['options'] = getBarChartOptions(
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
        ...barChartPrimaryDataset,
        label: 'Interest',
      },
    ],
  };

  payoutScheduleChartOptions: ChartConfiguration['options'] =
    getBarChartOptions('Month', 'Interest', false, true, (context): string => {
      const label = context.dataset.label || '';
      const value = context.parsed.y;

      return label && value
        ? `${label}: ${this.decimalPipe.transform(value, '1.0-0') || ''}`
        : '';
    });

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
    const compoundingValue = this.getFrequencyValue(this.compoundingFrequency);
    return this.interestPayoutTypeValues.filter((payoutType) => {
      const payoutValue = this.getFrequencyValue(payoutType);
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
    const timeInYears = this.getTimeInYears();

    if (timeInYears <= 0 || !this.investmentStartDate) {
      // Reset values if invalid input
      this.maturityAmount = 0;
      this.interestEarned = 0;
      this.maturityDate = null;
      this.payoutSchedule = [];
      return;
    }

    // Calculate maturity date
    this.calculateMaturityDate();

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
      this.calculateMaturityDate();
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const maturityDate = new Date(this.maturityDate!);
    let currentDate = new Date(this.investmentStartDate);

    let frequency;
    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      frequency = this.compoundingFrequency;
    } else {
      frequency = this.interestPayoutType;
    }

    while (currentDate < maturityDate) {
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
        nextDate = this.getNextFinancialQuarterDate(currentDate);
      } else {
        nextDate = this.getNextCompoundingDate(
          currentDate,
          frequency as CompoundingFrequency,
        );
      }

      // Ensure nextDate does not exceed maturityDate
      if (nextDate > maturityDate) {
        nextDate = new Date(maturityDate);
      }

      // Calculate days in period
      const daysInPeriod = this.differenceInDays(nextDate, currentDate);

      // Interest calculation
      const interestAmount =
        (principal * annualRate * daysInPeriod) /
        this.getDaysInYear(currentDate.getFullYear());

      // For "Maturity" payout type, accumulate interest
      if (this.interestPayoutType === InterestPayoutType.Maturity) {
        // Accumulate interest
        const totalDays = this.differenceInDays(
          nextDate,
          this.investmentStartDate,
        );
        const accumulatedAmount =
          principal *
          Math.pow(
            1 + annualRate / this.getFrequencyValue(this.compoundingFrequency),
            (this.getFrequencyValue(this.compoundingFrequency) * totalDays) /
              this.getDaysInYear(this.investmentStartDate.getFullYear()),
          );
        const interestAccumulated = accumulatedAmount - principal;
        this.payoutSchedule.push({
          date: new Date(nextDate),
          interestAmount: interestAccumulated,
        });
      } else {
        // Pro-rata interest
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

    const principal = this.depositAmount;
    const annualRate = this.annualInterestRate / 100;

    if (!this.maturityDate) {
      this.calculateMaturityDate();
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const maturityDate = new Date(this.maturityDate!);

    let currentDate = new Date(this.investmentStartDate);
    let openingBalance = principal;
    let yearIndex = 1;

    // Number of compounding periods per year
    const n = this.getFrequencyValue(this.compoundingFrequency);

    while (currentDate < maturityDate) {
      const nextYearDate = new Date(currentDate);
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

      if (nextYearDate > maturityDate) {
        nextYearDate.setTime(maturityDate.getTime());
      }

      // How many days in this "yearly" period
      const daysInPeriod = this.differenceInDays(nextYearDate, currentDate);
      const fractionOfYear =
        daysInPeriod / this.getDaysInYear(currentDate.getFullYear());

      // Compound the balance for fractionOfYear
      const newBalance =
        openingBalance * Math.pow(1 + annualRate / n, n * fractionOfYear);
      const interestForPeriod = newBalance - openingBalance;

      this.yearlySummary.push({
        year: yearIndex,
        openingBalance: openingBalance,
        interestEarned: interestForPeriod,
        closingBalance: newBalance,
      });

      openingBalance = newBalance;
      currentDate = nextYearDate;
      yearIndex++;

      if (currentDate >= maturityDate) {
        break;
      }
    }

    this.updateYearlySummaryChartData();
  }

  private getNextFinancialQuarterDate(date: Date): Date {
    const year = date.getFullYear();

    // End dates of financial quarters: Mar 31, Jun 30, Sep 30, Dec 31
    const quarterEndDates = [
      new Date(year, 2, 31), // March 31
      new Date(year, 5, 30), // June 30
      new Date(year, 8, 30), // September 30
      new Date(year, 11, 31), // December 31
    ];

    for (const quarterEnd of quarterEndDates) {
      if (date < quarterEnd) {
        return quarterEnd;
      }
    }

    // If the current date is after Dec 31, jump to the next year's Mar 31
    return new Date(year + 1, 2, 31);
  }

  private getNextCompoundingDate(
    date: Date,
    frequency: CompoundingFrequency | InterestPayoutType,
  ): Date {
    let nextDate = new Date(date);

    if (
      frequency === CompoundingFrequency.Monthly ||
      frequency === InterestPayoutType.Monthly
    ) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (
      frequency === CompoundingFrequency.Quarterly ||
      frequency === InterestPayoutType.Quarterly
    ) {
      nextDate = this.getNextFinancialQuarterDate(nextDate);
    } else if (frequency === CompoundingFrequency.HalfYearly) {
      nextDate.setMonth(nextDate.getMonth() + 6);
    } else if (frequency === CompoundingFrequency.Yearly) {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      // Default to yearly if frequency is unrecognized
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    return nextDate;
  }

  private calculateMaturityDate() {
    this.maturityDate = new Date(this.investmentStartDate);
    this.maturityDate.setFullYear(
      this.maturityDate.getFullYear() + this.depositTermYears,
    );
    this.maturityDate.setMonth(
      this.maturityDate.getMonth() + this.depositTermMonths,
    );
    this.maturityDate.setDate(
      this.maturityDate.getDate() + this.depositTermDays,
    );
  }

  private getTimeInYears(): number {
    const years = this.depositTermYears || 0;
    const months = this.depositTermMonths || 0;
    const days = this.depositTermDays || 0;

    return years + months / 12 + days / 365;
  }

  private getFrequencyValue(
    frequency: InterestPayoutType | CompoundingFrequency,
  ): number {
    switch (frequency) {
      case InterestPayoutType.Monthly:
      case CompoundingFrequency.Monthly:
        return 12;
      case InterestPayoutType.Quarterly:
      case CompoundingFrequency.Quarterly:
        return 4;
      case CompoundingFrequency.HalfYearly:
        return 2;
      case CompoundingFrequency.Yearly:
        return 1;
      case InterestPayoutType.Maturity:
        return 1; // Treated as a single payout
      default:
        return 1;
    }
  }

  private differenceInDays(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // Hours * Minutes * Seconds * Milliseconds
    const diffInTime = date1.getTime() - date2.getTime();
    return Math.round(diffInTime / oneDay);
  }

  private getDaysInYear(year: number): number {
    // True if the year is divisible by 400,
    // or if it is divisible by 4 but not by 100
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0) ? 366 : 365;
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
      (item) => item.interestEarned,
    );
    this.yearlySummaryChartData.datasets[1].data = this.yearlySummary.map(
      (item) => item.closingBalance,
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
        },
      );

      this.resetDatepicker();
    }
  }
}
