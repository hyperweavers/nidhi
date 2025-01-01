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

import { Flowbite } from '../../decorators/flowbite.decorator';
import { ChartType } from '../../models/chart';
import {
  AnnualSummary,
  CompoundingFrequency,
  CompoundingSummary,
  FinancialYearSummary,
  InterestPayoutType,
  PayoutSchedule,
} from '../../models/deposit';
import { ChartUtils } from '../../utils/chart.utils';
import { DateUtils } from '../../utils/date.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  ANNUAL_SUMMARY,
  COMPOUNDING_SUMMARY,
  FINANCIAL_YEAR_SUMMARY,
  PAYOUT_SCHEDULE,
}

enum Charts {
  EARNINGS,
  ANNUAL_SUMMARY,
  COMPOUNDING_SUMMARY,
  FINANCIAL_YEAR_SUMMARY,
  PAYOUT_SCHEDULE,
}

@Flowbite()
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
  @ViewChild('annualSummaryChart', { read: BaseChartDirective })
  annualSummaryChart!: BaseChartDirective;
  @ViewChild('compoundingSummaryChart', { read: BaseChartDirective })
  compoundingSummaryChart!: BaseChartDirective;
  @ViewChild('financialYearSummaryChart', { read: BaseChartDirective })
  financialYearSummaryChart!: BaseChartDirective;

  @ViewChild('annualSummaryChartContainer')
  private annualSummaryChartContainer?: ElementRef;
  @ViewChild('compoundingSummaryChartContainer')
  private compoundingSummaryChartContainer?: ElementRef;
  @ViewChild('financialYearSummaryChartContainer')
  private financialYearSummaryChartContainer?: ElementRef;

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
  interestPayoutType: InterestPayoutType = InterestPayoutType.Maturity;
  compoundingFrequency: CompoundingFrequency = CompoundingFrequency.Quarterly;
  investmentStartDate: Date = new Date();

  maturityAmount = 0;
  interestEarned = 0;
  maturityDate: Date | null = null;
  effectiveYield = 0;
  averagePayout = 0;

  annualSummary: AnnualSummary[] = [];
  compoundingSummary: CompoundingSummary[] = [];
  financialYearSummary: FinancialYearSummary[] = [];
  payoutSchedule: PayoutSchedule[] = [];

  private financialYearStartMonth = 3; // Default to April

  activeTab: Tabs = Tabs.ANNUAL_SUMMARY;

  compoundingSummaryPage = 0;
  payoutSchedulePage = 0;

  isChartInFullscreen = false;

  depositChartData: ChartData<ChartType.DOUGHNUT, number[], string | string[]> =
    {
      labels: ['Principal', 'Interest'],
      datasets: [
        {
          ...ChartUtils.defaultDoughnutChartDataset,
          ...ChartUtils.getDoughnutChartColors([
            ChartUtils.colorBlue,
            ChartUtils.colorGreen,
          ]),
        },
      ],
    };

  depositChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    ChartUtils.getDoughnutChartOptions((context): string => {
      return this.decimalPipe.transform(context.parsed, '1.0-0') || '';
    });

  annualSummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorBlue),
        label: 'Principal',
      },
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorGreen),
        label: 'Compounded Interest',
      },
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorYellow),
        label: 'Annual Interest',
      },
    ],
  };

  annualSummaryChartOptions: ChartConfiguration['options'] =
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
      (tooltipItems): string => {
        return tooltipItems.length > 0
          ? `Total Interest: ${
              this.decimalPipe.transform(
                tooltipItems.reduce(
                  (acc, cv) => (acc += cv?.parsed?.y || 0),
                  0,
                ) - this.depositAmount,
                '1.0-0',
              ) || ''
            }`
          : '';
      },
    );

  compoundingSummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorGreen),
        label: 'Interest Earned',
      },
    ],
  };

  compoundingSummaryChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Month',
      'Amount',
      false,
      true,
      (context): string => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;

        return label && value
          ? `${label}: ${this.decimalPipe.transform(value, '1.0-0') || ''}`
          : '';
      },
      (tooltipItems): string =>
        tooltipItems[0]?.label ? `Month: ${tooltipItems[0].label}` : '',
    );

  financialYearSummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorGreen),
        label: 'Interest Earned',
      },
    ],
  };

  financialYearSummaryChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Financial Year',
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
      (tooltipItems): string =>
        tooltipItems[0]?.label ? `FY: ${tooltipItems[0].label}` : '',
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
    this.isChartInFullscreen = !!this.document.fullscreenElement;
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
        case Charts.ANNUAL_SUMMARY:
          container = this.annualSummaryChartContainer;
          break;

        case Charts.COMPOUNDING_SUMMARY:
          container = this.compoundingSummaryChartContainer;
          break;

        case Charts.FINANCIAL_YEAR_SUMMARY:
          container = this.financialYearSummaryChartContainer;
          break;

        case Charts.PAYOUT_SCHEDULE:
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

    const timeInYears = DateUtils.convertDepositTermToYears(
      this.depositTermYears,
      this.depositTermMonths,
      this.depositTermDays,
    );

    // Reset values if invalid input
    if (timeInYears <= 0 || !this.investmentStartDate) {
      this.maturityAmount = 0;
      this.interestEarned = 0;
      this.maturityDate = null;
      this.effectiveYield = 0;
      this.averagePayout = 0;
      this.annualSummary = [];
      this.compoundingSummary = [];
      this.financialYearSummary = [];
      this.payoutSchedule = [];
      return;
    }

    this.maturityDate = DateUtils.getDepositMaturityDate(
      this.investmentStartDate,
      this.depositTermYears,
      this.depositTermMonths,
      this.depositTermDays,
    );

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      this.payoutSchedule = [];
      this.averagePayout = 0;

      this.generateCompoundingSummary(principal);
    } else {
      this.compoundingSummary = [];

      this.generatePayoutSchedule(principal);
    }

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      if (this.compoundingSummary.length > 0) {
        const lastEntry =
          this.compoundingSummary[this.compoundingSummary.length - 1];
        this.maturityAmount = lastEntry.closingBalance;
        this.interestEarned = lastEntry.closingBalance - this.depositAmount;
      } else {
        this.maturityAmount = principal;
        this.interestEarned = 0;
      }
    } else {
      this.maturityAmount = principal;
      this.interestEarned = this.payoutSchedule.reduce(
        (total, payout) => total + payout.interestAmount,
        0,
      );
    }

    if (this.maturityAmount > 0 && principal > 0 && timeInYears > 0) {
      // Simple interest rate that would yield the same total interest
      // over the same time period:
      this.effectiveYield =
        (this.interestEarned / (principal * timeInYears)) * 100;
    } else {
      this.effectiveYield = 0;
    }

    this.generateAnnualSummary();
    this.generateFinancialYearSummary();

    this.activeTab = Tabs.ANNUAL_SUMMARY;

    this.updateEarningsChartData();
  }

  private generatePayoutSchedule(principal: number) {
    this.payoutSchedule = [];
    this.averagePayout = 0;

    if (!this.maturityDate) {
      return;
    }

    const annualRate = this.annualInterestRate / 100;
    const maturityDate = new Date(this.maturityDate);
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
        nextDate = DateUtils.getNextFinancialQuarterEndDate(currentDate);
      } else {
        // Default to yearly compounding frequency
        nextDate = DateUtils.getNextCompoundingDate(
          currentDate,
          frequency as CompoundingFrequency,
        );
      }

      if (nextDate > maturityDate) {
        nextDate = new Date(maturityDate);
      }

      const interestStartDate = new Date(currentDate);
      interestStartDate.setDate(interestStartDate.getDate() + 1);

      if (interestStartDate >= nextDate) {
        currentDate = nextDate;
        continue;
      }

      const totalDays = DateUtils.getDifferenceInDays(
        new Date(nextDate.getTime() + 24 * 60 * 60 * 1000),
        interestStartDate,
      );

      const n = DateUtils.convertFrequencyToValue(this.compoundingFrequency);
      const closingBalance =
        principal * Math.pow(1 + annualRate / n, (n * totalDays) / 365);
      const interestAmount = closingBalance - principal;

      this.payoutSchedule.push({
        date: new Date(nextDate),
        interestAmount,
      });

      if (nextDate >= maturityDate) {
        break;
      }
      currentDate = nextDate;
    }

    this.averagePayout =
      this.payoutSchedule.length > 0
        ? this.payoutSchedule.reduce(
            (acc, cv) => (acc += cv.interestAmount),
            0,
          ) / this.payoutSchedule.length
        : 0;

    this.payoutSchedulePage = 0;
  }

  private generateCompoundingSummary(principal: number) {
    this.compoundingSummary = [];

    if (!this.maturityDate) {
      return;
    }

    const annualRate = this.annualInterestRate / 100;
    const maturityDate = new Date(this.maturityDate);
    let currentDate = new Date(this.investmentStartDate);

    let currentBalance = principal;

    while (currentDate < maturityDate) {
      let nextDate: Date;
      if (this.compoundingFrequency === CompoundingFrequency.Monthly) {
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (this.compoundingFrequency === CompoundingFrequency.Quarterly) {
        nextDate = DateUtils.getNextFinancialQuarterEndDate(currentDate);
      } else {
        nextDate = DateUtils.getNextCompoundingDate(
          currentDate,
          this.compoundingFrequency,
        );
      }

      if (nextDate > maturityDate) {
        nextDate = new Date(maturityDate);
      }

      const interestStartDate = new Date(currentDate);
      interestStartDate.setDate(interestStartDate.getDate() + 1);

      if (interestStartDate >= nextDate) {
        currentDate = nextDate;
        continue;
      }

      const totalDays = DateUtils.getDifferenceInDays(
        nextDate,
        new Date(this.investmentStartDate.getTime() + 24 * 60 * 60 * 1000),
      );

      const n = DateUtils.convertFrequencyToValue(this.compoundingFrequency);
      const closingBalance =
        principal * Math.pow(1 + annualRate / n, (n * totalDays) / 365);
      const interestEarned = closingBalance - currentBalance;

      this.compoundingSummary.push({
        date: nextDate,
        openingBalance: currentBalance,
        amountDeposited: this.depositAmount,
        interestEarned,
        closingBalance,
      });

      currentBalance = closingBalance;
      currentDate = nextDate;

      if (nextDate >= maturityDate) {
        break;
      }
    }

    this.compoundingSummaryPage = 0;

    this.updateCompoundingSummaryChartData();
  }

  private generateAnnualSummary() {
    this.annualSummary = [];

    let runningBalance = this.depositAmount;
    let currentYear = this.investmentStartDate.getFullYear();
    let openingBalance = runningBalance;
    let interestAccumulatedThisYear = 0;
    let interestAccumulatedOverall = 0;

    const finalizeYear = () => {
      this.annualSummary.push({
        year: currentYear,
        yearlyInterestEarned: interestAccumulatedThisYear,
        totalInterestEarned: interestAccumulatedOverall,
        totalDeposits: this.depositAmount,
        openingBalance:
          this.interestPayoutType === InterestPayoutType.Maturity
            ? openingBalance
            : this.depositAmount,
        closingBalance:
          this.interestPayoutType === InterestPayoutType.Maturity
            ? runningBalance
            : this.depositAmount,
      });
    };

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      for (const summary of this.compoundingSummary) {
        const payoutYear = summary.date.getFullYear();

        if (payoutYear > currentYear) {
          finalizeYear();
          currentYear++;
          openingBalance = runningBalance;
          interestAccumulatedThisYear = 0;
        }

        interestAccumulatedThisYear += summary.interestEarned;
        interestAccumulatedOverall += summary.interestEarned;
        runningBalance = openingBalance + interestAccumulatedThisYear;
      }
    } else {
      for (const payout of this.payoutSchedule) {
        const payoutYear = payout.date.getFullYear();

        if (payoutYear > currentYear) {
          finalizeYear();
          currentYear++;
          openingBalance = this.depositAmount;
          interestAccumulatedThisYear = 0;
        }

        interestAccumulatedThisYear += payout.interestAmount;
        interestAccumulatedOverall += payout.interestAmount;
        runningBalance = this.depositAmount;
      }
    }

    finalizeYear();

    this.updateAnnualSummaryChartData();
  }

  private generateFinancialYearSummary() {
    this.financialYearSummary = [];

    let runningBalance = this.depositAmount;
    let fyStartDate = new Date(
      this.investmentStartDate.getFullYear(),
      this.financialYearStartMonth,
      1,
    );
    let fyEndDate = new Date(
      fyStartDate.getFullYear() + 1,
      this.financialYearStartMonth - 1,
      31,
    );
    let openingBalance = runningBalance;
    let interestAccumulatedThisYear = 0;

    const finalizeYear = () => {
      this.financialYearSummary.push({
        financialYearLabel: `${fyStartDate.getFullYear().toString().slice(-2)}-${fyEndDate.getFullYear().toString().slice(-2)}`,
        openingBalance,
        amountDeposited: this.depositAmount,
        interestEarned: interestAccumulatedThisYear,
        closingBalance: runningBalance,
      });
    };

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      for (const summary of this.compoundingSummary) {
        const payoutDate = new Date(summary.date);

        if (payoutDate > fyEndDate) {
          finalizeYear();
          fyStartDate = new Date(fyEndDate);
          fyEndDate = new Date(
            fyStartDate.getFullYear() + 1,
            this.financialYearStartMonth - 1,
            31,
          );
          openingBalance = runningBalance;
          interestAccumulatedThisYear = 0;
        }

        interestAccumulatedThisYear += summary.interestEarned;
        runningBalance = openingBalance + interestAccumulatedThisYear;
      }
    } else {
      for (const payout of this.payoutSchedule) {
        const payoutDate = new Date(payout.date);

        if (payoutDate > fyEndDate) {
          finalizeYear();
          fyStartDate = new Date(fyEndDate);
          fyEndDate = new Date(
            fyStartDate.getFullYear() + 1,
            this.financialYearStartMonth - 1,
            31,
          );
          openingBalance = runningBalance;
          interestAccumulatedThisYear = 0;
        }

        interestAccumulatedThisYear += payout.interestAmount;
        runningBalance = openingBalance + interestAccumulatedThisYear;
      }
    }

    finalizeYear();

    this.updateFinancialYearSummaryChartData();
  }

  private updateEarningsChartData() {
    this.depositChartData.datasets[0].data = [
      Math.floor(this.depositAmount),
      Math.floor(this.interestEarned),
    ];
    if (this.earningsChart) {
      this.earningsChart.update();
    }
  }

  private updateAnnualSummaryChartData() {
    this.annualSummaryChartData.labels = this.annualSummary.map(
      (item) => item.year,
    );
    this.annualSummaryChartData.datasets[0].data = new Array(
      this.annualSummary.length,
    ).fill(this.depositAmount);

    if (this.annualSummaryChartData.datasets.length === 2) {
      this.annualSummaryChartData.datasets[2] =
        this.annualSummaryChartData.datasets[1];
      this.annualSummaryChartData.datasets[1] = {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorGreen),
        label: 'Compounded Interest',
      };
    }

    if (this.interestPayoutType === InterestPayoutType.Maturity) {
      this.annualSummaryChartData.datasets[1].data = this.annualSummary.map(
        (item) => item.openingBalance - this.depositAmount,
      );
      this.annualSummaryChartData.datasets[2].data = this.annualSummary.map(
        (item) => item.closingBalance - item.openingBalance,
      );
    } else {
      if (
        this.interestPayoutType.toString() !==
        this.compoundingFrequency.toString()
      ) {
        this.annualSummaryChartData.datasets[1].data = this.annualSummary.map(
          (item) => {
            const compoundingFrequencyPerAnnum =
              DateUtils.convertFrequencyToValue(this.compoundingFrequency) || 1;

            return (
              (compoundingFrequencyPerAnnum - 1) *
              (item.yearlyInterestEarned / compoundingFrequencyPerAnnum)
            );
          },
        );
        this.annualSummaryChartData.datasets[2].data = this.annualSummary.map(
          (item) =>
            item.yearlyInterestEarned /
            (DateUtils.convertFrequencyToValue(this.compoundingFrequency) || 1),
        );
      } else {
        this.annualSummaryChartData.datasets[1].data = [];
        this.annualSummaryChartData.datasets[2].data = this.annualSummary.map(
          (item) => item.yearlyInterestEarned,
        );
      }
    }

    this.annualSummaryChartData.datasets =
      this.annualSummaryChartData.datasets.filter((ds) => ds.data.length > 0);

    if (this.annualSummaryChart) {
      this.annualSummaryChart.update();
    }
  }

  private updateCompoundingSummaryChartData() {
    this.compoundingSummaryChartData.labels = this.compoundingSummary.map(
      (item) => this.datePipe.transform(item.date, 'MMM yy'),
    );
    this.compoundingSummaryChartData.datasets[0].data =
      this.compoundingSummary.map(
        (item) => item.openingBalance - this.depositAmount,
      );

    if (this.compoundingSummaryChart) {
      this.compoundingSummaryChart.update();
    }
  }

  private updateFinancialYearSummaryChartData(): void {
    this.financialYearSummaryChartData.labels = this.financialYearSummary.map(
      (item) => item.financialYearLabel,
    );

    this.financialYearSummaryChartData.datasets[0].data =
      this.financialYearSummary.map((item) => item.interestEarned);

    if (this.financialYearSummaryChart) {
      this.financialYearSummaryChart.update();
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
