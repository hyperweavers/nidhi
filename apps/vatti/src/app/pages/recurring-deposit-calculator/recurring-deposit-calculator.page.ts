/*
RD Maturity Calculation Formula:

M = P * Math.pow((1 + ((r/100)/n)), (t*n))

Where,
  M = Maturity amount
  P = Monthly installment
  r = Annual rate of interest
  n = Number of compounding in a year
  t = Number of years

This formula computes the amount for each month. Calculate the monthly amount for each month and
then add all the amounts to get the maturity value at the end of the tenure.

Let's assume a monthly investment of 5,000 for 1 year at 8% interest rate compounded quarterly.

For the first month, 2000 * Math.pow((1 + ((8/100)/4)), ((1/12)*4)) = 2013
For the second month, 2000 * Math.pow((1 + ((8/100)/4)), ((2/12)*4)) = 2027
For the third month, 2000 * Math.pow((1 + ((8/100)/4)), ((3/12)*4)) = 2040
...
For the last month, 2000 * Math.pow((1 + ((8/100)/4)), ((12/12)*4)) = 2165

Thus, the maturity amount is 25,059 (approximately), interest earned comes to 25,059 - 24,000 = 1,059.

---------------------------------------------------------------------------------------------------------------

RD Monthly Installment Calculation Formula:

P = M / ((Math.pow((1 + ((r/100)/n)), (n * t)) - 1) / (1 - Math.pow((1 + ((r/100)/n)), (-1/(12/n)))))

Where,
  P = Monthly installment
  M = Maturity amount
  r = Annual rate of interest
  n = Number of compounding in a year
  t = Number of years

Let's assume to earn a maturity amount of 1,00,000 within 1 year at 8% interest rate compounded quarterly.

For the monthly installment, the calculations are as follows:
P = 100000 / ((Math.pow((1 + ((8/100)/4)), (4 * 1)) - 1) / (1 - Math.pow((1 + ((8/100)/4)), (-1/(12/4)))))
P = 100000 / ((Math.pow((1 + 0.02), 4) - 1) / (1 - Math.pow((1 + 0.02), (-1/3))))
P = 100000 / ((Math.pow((1.02), 4) - 1) / (1 - Math.pow((1.02), (-1/3))))
P = 7981 (approximately)
*/

import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { addMonths } from 'date-fns';
import { BaseChartDirective } from 'ng2-charts';

import { ChartType } from '../../models/chart';
import { EnumObject } from '../../models/common';
import {
  AnnualSummary,
  CompoundingFrequency,
  CompoundingSummary,
  FinancialYearSummary,
  InstallmentSummary,
  RecurringDepositCalculation,
} from '../../models/deposit';
import { ChartUtils } from '../../utils/chart.utils';
import { DateUtils } from '../../utils/date.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  ANNUAL_SUMMARY,
  COMPOUNDING_SUMMARY,
  FINANCIAL_YEAR_SUMMARY,
}

enum Charts {
  EARNINGS,
  ANNUAL_SUMMARY,
  COMPOUNDING_SUMMARY,
  FINANCIAL_YEAR_SUMMARY,
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
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly decimalPipe = inject(DecimalPipe);
  private readonly datePipe = inject(DatePipe);

  @ViewChild('investmentStartDateInput', { static: true })
  private investmentStartDateInput?: ElementRef;

  @ViewChild('earningsChart', { read: BaseChartDirective })
  private earningsChart!: BaseChartDirective;
  @ViewChild('annualSummaryChart', { read: BaseChartDirective })
  private annualSummaryChart!: BaseChartDirective;
  @ViewChild('compoundingSummaryChart', { read: BaseChartDirective })
  private compoundingSummaryChart!: BaseChartDirective;
  @ViewChild('financialYearSummaryChart', { read: BaseChartDirective })
  private financialYearSummaryChart!: BaseChartDirective;

  @ViewChild('annualSummaryChartContainer')
  private annualSummaryChartContainer?: ElementRef;
  @ViewChild('compoundingSummaryChartContainer')
  private compoundingSummaryChartContainer?: ElementRef;
  @ViewChild('financialYearSummaryChartContainer')
  private financialYearSummaryChartContainer?: ElementRef;

  readonly pageSize = 12;

  readonly RecurringDepositCalculation = RecurringDepositCalculation;
  readonly ChartType = ChartType;
  readonly Tabs = Tabs;
  readonly Charts = Charts;

  availableCompoundingFrequencies: Array<EnumObject<string>> = Object.entries(
    CompoundingFrequency,
  )
    .filter((payoutFrequency) => typeof payoutFrequency[1] === 'number')
    .filter((payoutType) => payoutType[1] !== CompoundingFrequency.None)
    .map((payoutType) => ({
      key: payoutType[1] as number,
      value: payoutType[0],
    }));

  calculationType = RecurringDepositCalculation.Maturity;
  monthlyInstallment = 2000;
  annualInterestRate = 7;

  depositTermYears = 5;
  depositTermMonths = 0;

  totalDeposit = 0;
  interestEarned = 0;
  maturityAmount = 0;

  compoundingFrequency: CompoundingFrequency = CompoundingFrequency.Quarterly;
  investmentStartDate: Date = new Date();
  maturityDate: Date | null = null;

  private installmentSummary: InstallmentSummary[] = [];
  annualSummary: AnnualSummary[] = [];
  compoundingSummary: CompoundingSummary[] = [];
  financialYearSummary: FinancialYearSummary[] = [];

  activeTab: Tabs = Tabs.ANNUAL_SUMMARY;

  compoundingSummaryPage = 0;

  isChartInFullscreen = false;

  depositChartData: ChartData<ChartType.DOUGHNUT, number[], string | string[]> =
    {
      labels: ['Deposits', 'Interest'],
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
    ChartUtils.getDoughnutChartOptions(
      (context): string =>
        this.decimalPipe.transform(context.parsed, '1.0-0') || '',
    );

  annualSummaryChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorBlue),
        label: 'Total Deposits',
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
      (tooltipItems): string =>
        tooltipItems[0]?.label ? `Year: ${tooltipItems[0].label}` : '',
      (tooltipItems): string => {
        return tooltipItems.length > 0
          ? `Closing Balance: ${
              this.decimalPipe.transform(
                tooltipItems.reduce(
                  (acc, cv) => (acc += cv?.parsed?.y || 0),
                  0,
                ),
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

  ngOnInit() {
    this.initDatePicker();

    this.calculateMaturityAmount();
  }

  @HostListener('window:fullscreenchange')
  onFullscreenChange() {
    this.isChartInFullscreen = !!this.document.fullscreenElement;
  }

  onCalculationTypeChange(type: RecurringDepositCalculation) {
    this.calculationType = type;

    if (this.calculationType === RecurringDepositCalculation.Maturity) {
      this.maturityAmount = 0;
      this.monthlyInstallment = 2000;
    } else {
      this.maturityAmount = 100000;
      this.monthlyInstallment = 0;
    }

    this.calculateMaturityAmount();
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
        case Charts.ANNUAL_SUMMARY:
          container = this.annualSummaryChartContainer;
          break;

        case Charts.COMPOUNDING_SUMMARY:
          container = this.compoundingSummaryChartContainer;
          break;

        case Charts.FINANCIAL_YEAR_SUMMARY:
          container = this.financialYearSummaryChartContainer;
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
    const timeInYears = DateUtils.convertDepositTermToYears(
      this.depositTermYears,
      this.depositTermMonths,
    );

    // Reset if invalid input
    if (timeInYears <= 0) {
      this.totalDeposit = 0;
      this.maturityAmount = 0;
      this.interestEarned = 0;
      this.maturityDate = null;
      this.installmentSummary = [];
      this.annualSummary = [];
      this.compoundingSummary = [];
      this.financialYearSummary = [];

      this.updateEarningsChartData();
      this.updateAnnualSummaryChartData();
      this.updateCompoundingSummaryChartData();
      this.updateFinancialYearSummaryChartData();

      return;
    }

    const annualRate = this.annualInterestRate / 100;
    const compoundingFrequency = Number(this.compoundingFrequency);
    const compoundingInterest = annualRate / compoundingFrequency;
    const totalInstallments = timeInYears * 12;

    if (this.calculationType === RecurringDepositCalculation.Installment) {
      this.monthlyInstallment =
        this.maturityAmount /
        ((Math.pow(
          1 + compoundingInterest,
          compoundingFrequency * timeInYears,
        ) -
          1) /
          (1 -
            Math.pow(
              1 + compoundingInterest,
              -1 / (12 / compoundingFrequency),
            )));
    }

    this.installmentSummary = [];

    this.maturityDate = DateUtils.getDepositMaturityDate(
      this.investmentStartDate,
      this.depositTermYears,
      this.depositTermMonths,
    );

    for (let i = 0; i <= totalInstallments; i++) {
      let date: Date;
      let deposit: number;
      let interest: number;
      let balance: number;

      if (i === 0) {
        date = new Date(this.investmentStartDate);
        deposit = this.monthlyInstallment;
        balance = deposit;
        interest = 0;
      } else if (i === totalInstallments) {
        date = addMonths(this.investmentStartDate, i);
        deposit = 0;
        balance =
          this.monthlyInstallment *
            Math.pow(1 + compoundingInterest, (i / 12) * compoundingFrequency) -
          this.monthlyInstallment;
        interest = balance;
      } else {
        date = addMonths(this.investmentStartDate, i);
        deposit = this.monthlyInstallment;
        balance =
          this.monthlyInstallment *
          Math.pow(1 + compoundingInterest, (i / 12) * compoundingFrequency);
        interest = balance - deposit;
      }

      this.installmentSummary.push({
        installment: i,
        date,
        deposit,
        interest,
        balance,
      });
    }

    if (this.installmentSummary.length > 0) {
      this.totalDeposit = this.monthlyInstallment * totalInstallments;
      this.maturityAmount = Math.round(
        this.installmentSummary.reduce((acc, cv) => (acc += cv.balance), 0),
      );
      this.interestEarned = this.maturityAmount - this.totalDeposit;
    } else {
      this.totalDeposit = 0;
      this.maturityAmount = 0;
      this.interestEarned = 0;
    }

    this.generateAnnualSummary();
    this.generateCompoundingSummary();
    this.generateFinancialYearSummary();

    this.activeTab = Tabs.ANNUAL_SUMMARY;

    this.updateEarningsChartData();
  }

  private generateAnnualSummary(): void {
    this.annualSummary = [];

    let currentYear = this.investmentStartDate.getFullYear();
    let interestAccumulatedThisYear = 0;
    let interestAccumulatedOverall = 0;
    let totalDeposits = 0;
    let openingBalance = 0;
    let closingBalance = 0;

    const finalizeYear = () => {
      this.annualSummary.push({
        year: currentYear,
        yearlyInterestEarned: interestAccumulatedThisYear,
        totalInterestEarned: interestAccumulatedOverall,
        totalDeposits,
        openingBalance,
        closingBalance,
      });
    };

    for (const summary of this.installmentSummary) {
      const installmentYear = summary.date.getFullYear();

      if (installmentYear > currentYear) {
        finalizeYear();
        currentYear++;
        interestAccumulatedThisYear = 0;
        totalDeposits = 0;
        openingBalance = closingBalance;
      }

      totalDeposits += summary.deposit;
      interestAccumulatedThisYear += summary.interest;
      interestAccumulatedOverall += summary.interest;
      closingBalance += summary.balance;
    }

    finalizeYear();

    this.updateAnnualSummaryChartData();
  }

  private generateCompoundingSummary() {
    this.compoundingSummary = [];

    let compoundingDate = DateUtils.getNextCompoundingOrPayoutDate(
      this.investmentStartDate,
      this.compoundingFrequency,
    );
    let openingBalance = 0;
    let amountDeposited = 0;
    let interestEarned = 0;
    let closingBalance = 0;

    if (!compoundingDate) {
      return;
    }

    const finalizeYear = () => {
      this.compoundingSummary.push({
        date: compoundingDate as Date,
        openingBalance,
        amountDeposited,
        interestEarned,
        closingBalance,
      });
    };

    for (const summary of this.installmentSummary) {
      const installmentDate = new Date(summary.date);

      if (installmentDate > compoundingDate) {
        finalizeYear();
        compoundingDate = DateUtils.getNextCompoundingOrPayoutDate(
          installmentDate,
          this.compoundingFrequency,
        );
        openingBalance = closingBalance;
        amountDeposited = 0;
        interestEarned = 0;

        if (!compoundingDate) {
          break;
        }
      }

      amountDeposited += summary.deposit;
      interestEarned += summary.interest;
      closingBalance += summary.balance;
    }

    finalizeYear();

    this.compoundingSummaryPage = 0;

    this.updateCompoundingSummaryChartData();
  }

  private generateFinancialYearSummary(): void {
    this.financialYearSummary = [];

    let openingBalance = 0;
    let amountDeposited = 0;
    let interestEarned = 0;
    let closingBalance = 0;
    let fy = DateUtils.getFinancialYear(this.investmentStartDate);
    let fyStartDate = fy.start;
    let fyEndDate = fy.end;

    const finalizeYear = () => {
      this.financialYearSummary.push({
        financialYearLabel: `${fyStartDate.getFullYear().toString().slice(-2)}-${fyEndDate.getFullYear().toString().slice(-2)}`,
        openingBalance,
        amountDeposited,
        interestEarned,
        closingBalance,
      });
    };

    for (const summary of this.installmentSummary) {
      const installmentDate = new Date(summary.date);

      if (installmentDate > fyEndDate) {
        finalizeYear();
        fy = DateUtils.getFinancialYear(installmentDate);
        fyStartDate = fy.start;
        fyEndDate = fy.end;
        openingBalance = closingBalance;
        amountDeposited = 0;
        interestEarned = 0;
      }

      amountDeposited += summary.deposit;
      interestEarned += summary.interest;
      closingBalance += summary.balance;
    }

    finalizeYear();

    this.updateFinancialYearSummaryChartData();
  }

  private updateEarningsChartData() {
    this.depositChartData.datasets[0].data = [
      Math.floor(this.totalDeposit),
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
    this.annualSummaryChartData.datasets[0].data = this.annualSummary.map(
      (item) => item.closingBalance - item.totalInterestEarned,
    );
    this.annualSummaryChartData.datasets[1].data = this.annualSummary.map(
      (item) => item.totalInterestEarned - item.yearlyInterestEarned,
    );
    this.annualSummaryChartData.datasets[2].data = this.annualSummary.map(
      (item) => item.yearlyInterestEarned,
    );

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
        (item, index) =>
          item.closingBalance -
          Math.min(index + 1, this.compoundingSummary.length - 1) *
            (12 / Number(this.compoundingFrequency)) *
            this.monthlyInstallment,
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
