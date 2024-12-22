import { CommonModule, DecimalPipe, DOCUMENT } from '@angular/common';
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
  Amortization,
  FinancialYearSummary,
  InterestRateRevision,
  InterestRateType,
  Prepayment,
  RevisionAdjustmentType,
} from '../../models/loan';
import {
  ChartType,
  getDoughnutChartOptions,
  getLineChartOptions,
  increaseLegendSpacing,
  lineChartPrimaryDataset,
  lineChartSecondaryDataset,
  principalInterestDoughnutChartDatasets,
  verticalHoverLine,
} from '../../utils/chart.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  AMORTIZATION_SCHEDULE,
  FINANCIAL_YEAR_SUMMARY,
  INTEREST_RATE_REVISIONS,
}

enum Charts {
  PAYMENTS,
  EMI,
  REVISIONS,
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [DecimalPipe],
  templateUrl: './loan-emi-calculator.page.html',
  styleUrl: './loan-emi-calculator.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanEmiCalculatorPage implements OnInit {
  @ViewChild('loanStartDateInput', { static: true })
  private loanStartDateInput?: ElementRef;
  @ViewChild('emiChart', { read: BaseChartDirective })
  emiChart!: BaseChartDirective;
  @ViewChild('revisionChart', { read: BaseChartDirective })
  revisionChart!: BaseChartDirective;
  @ViewChild('paymentsChart', { read: BaseChartDirective })
  paymentsChart!: BaseChartDirective;
  @ViewChild('emiChartContainer') private emiChartContainer?: ElementRef;
  @ViewChild('revisionsChartContainer')
  private revisionsChartContainer?: ElementRef;

  readonly pageSize = 12;

  readonly ChartType = ChartType;
  readonly InterestRateType = InterestRateType;
  readonly RevisionAdjustmentType = RevisionAdjustmentType;
  readonly Tabs = Tabs;
  readonly Charts = Charts;

  principalAmount = 2500000;
  annualInterestRate = 9;
  loanTermYears = 30;
  interestRateType: InterestRateType = InterestRateType.FLOATING;
  loanStartDate: Date = new Date();
  emiDebitDay = 5;
  financialYearStartMonth = 4; // Default to April

  monthlyPayment = 0;
  amortizationSchedule: Amortization[] = [];
  rateChanges: InterestRateRevision[] = [];
  prepayments: Prepayment[] = [];
  financialYearSummaries: FinancialYearSummary[] = [];

  private totalPrincipalPaid = 0;
  private totalInterestPaid = 0;
  totalPayments = 0;

  rateChangeMonth = 1;
  rateChangeNewRate = 0;
  rateChangeAdjustmentType: RevisionAdjustmentType =
    RevisionAdjustmentType.TENURE;

  prepaymentMonth = 1;
  prepaymentAmount = 0;
  prepaymentAdjustmentType: RevisionAdjustmentType =
    RevisionAdjustmentType.TENURE;

  activeTab = Tabs.AMORTIZATION_SCHEDULE;

  amortizationSchedulePage = 0;
  financialYearSummaryPage = 0;

  isChartInFullscreen = false;

  paymentsChartData: ChartData<
    ChartType.DOUGHNUT,
    number[],
    string | string[]
  > = {
    labels: ['Principal', 'Interest'],
    datasets: principalInterestDoughnutChartDatasets,
  };

  paymentsChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    getDoughnutChartOptions((context) => {
      return this.decimalPipe.transform(context.parsed, '1.0-0') || '';
    });

  emiChartData: ChartData<ChartType.LINE> = {
    labels: [],
    datasets: [
      {
        ...lineChartPrimaryDataset,
        label: 'Principal',
      },
      {
        ...lineChartSecondaryDataset,
        label: 'Interest',
      },
    ],
  };

  emiChartOptions: ChartConfiguration['options'] = getLineChartOptions(
    'EMI',
    'Amount',
    false,
    (context) => {
      const label = context.dataset.label || '';
      const value = context.parsed.y;

      return label && value
        ? `${label}: ${this.decimalPipe.transform(value, '1.0-0') || ''}`
        : '';
    },
    (tooltipItems) => {
      return tooltipItems[0]?.label ? `EMI: ${tooltipItems[0].label}` : '';
    },
  );

  revisionsChartData: ChartData<ChartType.LINE> = {
    labels: [],
    datasets: [
      {
        ...lineChartPrimaryDataset,
        label: 'Interest Rate',
      },
    ],
  };

  revisionsChartOptions: ChartConfiguration['options'] = getLineChartOptions(
    'EMI',
    'Interest Rate',
    false,
    (context) => {
      const label = context.dataset.label || '';
      const value = context.parsed.y;

      return label && value
        ? `${label}: ${this.decimalPipe.transform(value, '1.2-2') || ''}%`
        : '';
    },
    (tooltipItems) => {
      return tooltipItems[0]?.label ? `EMI: ${tooltipItems[0].label}` : '';
    },
  );

  emiAndRevisionsChartPlugins: ChartConfiguration['plugins'] = [
    verticalHoverLine,
    increaseLegendSpacing,
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly cdr: ChangeDetectorRef,
    private readonly decimalPipe: DecimalPipe,
  ) {}

  ngOnInit() {
    this.initDatePicker();

    this.calculateAmortization();
  }

  @HostListener('window:fullscreenchange')
  onFullscreenChange() {
    if (this.document.fullscreenElement) {
      this.isChartInFullscreen = true;
    } else {
      this.isChartInFullscreen = false;
    }
  }

  onLoanStartDateChange(dateString: string) {
    this.loanStartDate = new Date(dateString);
    this.calculateAmortization();
  }

  onRateChangeAdjustmentTypeChange(type: RevisionAdjustmentType) {
    this.rateChangeAdjustmentType = Number(type);
  }

  onPrepaymentAdjustmentTypeChange(type: RevisionAdjustmentType) {
    this.prepaymentAdjustmentType = Number(type);
  }

  onTabChange(tab: Tabs) {
    this.activeTab = +tab; // Convert `tab` from string to number
  }

  addRateChange() {
    this.rateChanges.push({
      month: this.rateChangeMonth,
      newRate: this.rateChangeNewRate,
      adjustmentType: this.rateChangeAdjustmentType,
    });
    this.rateChanges.sort((a, b) => a.month - b.month);
    this.rateChangeMonth++;
    this.calculateAmortization();
  }

  removeRateChange(index: number) {
    this.rateChanges.splice(index, 1);
    this.calculateAmortization();
  }

  addPrepayment() {
    this.prepayments.push({
      month: this.prepaymentMonth,
      amount: this.prepaymentAmount,
      adjustmentType: this.prepaymentAdjustmentType,
    });
    this.prepayments.sort((a, b) => a.month - b.month);
    this.prepaymentMonth++;
    this.calculateAmortization();
  }

  removePrepayment(index: number) {
    this.prepayments.splice(index, 1);
    this.calculateAmortization();
  }

  toggleFullscreen(chart: Charts) {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen();
    } else {
      let container: ElementRef | undefined;

      switch (chart) {
        case Charts.EMI:
          container = this.emiChartContainer;
          break;

        case Charts.REVISIONS:
          container = this.revisionsChartContainer;
          break;

        case Charts.PAYMENTS:
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

  calculateAmortization() {
    const P = this.principalAmount;
    const n = this.loanTermYears * 12;
    let balance = P;
    let totalInterest = 0;
    let currentRate = this.annualInterestRate;
    let maxTenure = n;

    this.amortizationSchedule = [];
    let monthlyPayment = this.calculateMonthlyPayment(P, currentRate, n);

    this.monthlyPayment = Math.ceil(monthlyPayment);

    if (this.interestRateType === InterestRateType.FLOATING) {
      this.rateChanges.sort((a, b) => a.month - b.month);
    }
    this.prepayments.sort((a, b) => a.month - b.month);

    let currentMonth = 1;
    let rateChangeIndex = 0;
    let prepaymentIndex = 0;

    // Reset financial year summaries
    this.financialYearSummaries = [];

    // Calculate the first payment date
    const paymentDate = new Date(this.loanStartDate);
    paymentDate.setDate(this.emiDebitDay);

    // Adjust the payment date if necessary
    if (paymentDate < this.loanStartDate) {
      paymentDate.setMonth(paymentDate.getMonth() + 1);
    }

    // Initialize a map to accumulate totals per financial year
    const fyTotals = new Map<
      string,
      { principal: number; interest: number; totalPayment: number }
    >();

    // Initialize totals
    this.totalPrincipalPaid = 0;
    this.totalInterestPaid = 0;
    this.totalPayments = 0;

    while (balance > 0 && currentMonth <= maxTenure) {
      // Handle interest rate changes
      if (
        this.interestRateType === InterestRateType.FLOATING &&
        rateChangeIndex < this.rateChanges.length &&
        currentMonth === this.rateChanges[rateChangeIndex].month
      ) {
        const rateChange = this.rateChanges[rateChangeIndex];
        currentRate = rateChange.newRate;

        if (rateChange.adjustmentType === RevisionAdjustmentType.EMI) {
          monthlyPayment = this.calculateMonthlyPayment(
            balance,
            currentRate,
            n - currentMonth + 1,
          );
          this.monthlyPayment = Math.ceil(monthlyPayment);
        } else {
          const newTenure = this.calculateNewTenure(
            balance,
            currentRate,
            monthlyPayment,
          );
          maxTenure = currentMonth + newTenure - 1;
        }
        rateChangeIndex++;
      }

      // Handle prepayments
      if (
        prepaymentIndex < this.prepayments.length &&
        currentMonth === this.prepayments[prepaymentIndex].month
      ) {
        const prepayment = this.prepayments[prepaymentIndex];
        balance = Math.max(balance - prepayment.amount, 0);

        // Add prepayment amount to total principal paid
        this.totalPrincipalPaid += prepayment.amount;

        // Determine the financial year for the prepayment
        const prepaymentDate = new Date(paymentDate); // Prepayment occurs on payment date
        const prepaymentFyStartDate = new Date(
          prepaymentDate.getFullYear(),
          this.financialYearStartMonth - 1,
          1,
        );
        if (prepaymentDate < prepaymentFyStartDate) {
          prepaymentFyStartDate.setFullYear(
            prepaymentFyStartDate.getFullYear() - 1,
          );
        }
        const prepaymentFyString = `${prepaymentFyStartDate.getFullYear()}-${(
          prepaymentFyStartDate.getFullYear() + 1
        )
          .toString()
          .slice(-2)}`;

        // Accumulate prepayment into financial year totals
        if (!fyTotals.has(prepaymentFyString)) {
          fyTotals.set(prepaymentFyString, {
            principal: 0,
            interest: 0,
            totalPayment: 0,
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const prepaymentTotals = fyTotals.get(prepaymentFyString)!;
        prepaymentTotals.principal += prepayment.amount;
        prepaymentTotals.totalPayment += prepayment.amount;

        // Adjust monthly payment or tenure if needed
        if (prepayment.adjustmentType === RevisionAdjustmentType.EMI) {
          monthlyPayment = this.calculateMonthlyPayment(
            balance,
            currentRate,
            n - currentMonth + 1,
          );
          this.monthlyPayment = Math.ceil(monthlyPayment);
        } else {
          const newTenure = this.calculateNewTenure(
            balance,
            currentRate,
            monthlyPayment,
          );
          maxTenure = currentMonth + newTenure - 1;
        }
        prepaymentIndex++;
      }

      // Calculate interest and principal payments
      const r = currentRate / 100 / 12;
      const interestPayment = balance * r;
      let principalPayment = monthlyPayment - interestPayment;

      // Ensure balance doesn't go negative
      if (principalPayment > balance) {
        principalPayment = balance;
        monthlyPayment = principalPayment + interestPayment;
      }

      balance = Math.max(balance - principalPayment, 0);
      totalInterest += interestPayment;

      // Accumulate totals
      this.totalPrincipalPaid += principalPayment;
      this.totalInterestPaid += interestPayment;

      // Determine the financial year for the current payment
      const fyStartDate = new Date(
        paymentDate.getFullYear(),
        this.financialYearStartMonth - 1,
        1,
      );
      if (paymentDate < fyStartDate) {
        fyStartDate.setFullYear(fyStartDate.getFullYear() - 1);
      }
      const fyString = `${fyStartDate.getFullYear().toString().slice(-2)}-${(
        fyStartDate.getFullYear() + 1
      )
        .toString()
        .slice(-2)}`;

      // Accumulate payment totals
      if (!fyTotals.has(fyString)) {
        fyTotals.set(fyString, { principal: 0, interest: 0, totalPayment: 0 });
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const totals = fyTotals.get(fyString)!;
      totals.principal += principalPayment;
      totals.interest += interestPayment;
      totals.totalPayment += monthlyPayment;

      // Add the payment to the amortization schedule
      this.amortizationSchedule.push({
        month: currentMonth,
        paymentDate: new Date(paymentDate), // Store the payment date
        payment: Math.ceil(monthlyPayment),
        principal: Math.ceil(principalPayment),
        interest: Math.ceil(interestPayment),
        totalInterest: Math.ceil(totalInterest),
        balance: Math.ceil(balance),
        interestRate: currentRate,
      });

      if (balance === 0) break;

      // Advance to the next month
      currentMonth++;
      paymentDate.setMonth(paymentDate.getMonth() + 1);
    }

    // Round the totals
    this.totalPrincipalPaid = Math.ceil(this.totalPrincipalPaid);
    this.totalInterestPaid = Math.ceil(this.totalInterestPaid);
    this.totalPayments = Math.ceil(
      this.totalPrincipalPaid + this.totalInterestPaid,
    );

    // Convert fyTotals map to an array for display
    this.financialYearSummaries = Array.from(fyTotals.entries()).map(
      ([financialYear, totals]) => ({
        financialYear,
        totalPrincipal: Math.ceil(totals.principal),
        totalInterest: Math.ceil(totals.interest),
        totalAmountPaid: Math.ceil(totals.totalPayment),
      }),
    );

    this.rateChangeNewRate =
      this.rateChanges[this.rateChanges.length - 1]?.newRate ||
      this.annualInterestRate;
    this.prepaymentAmount = Math.max(
      this.prepaymentAmount,
      this.monthlyPayment,
    );

    // Update charts
    this.updatePaymentsChart();
    this.updateEmiChart();

    if (this.interestRateType === InterestRateType.FLOATING) {
      this.updateRevisionChart();
    }
  }

  private calculateMonthlyPayment(
    principal: number,
    rate: number,
    tenure: number,
  ): number {
    const r = rate / 100 / 12;
    return (principal * r) / (1 - Math.pow(1 + r, -tenure));
  }

  private calculateNewTenure(
    balance: number,
    rate: number,
    emi: number,
  ): number {
    const r = rate / 100 / 12;
    return Math.ceil(-Math.log(1 - (balance * r) / emi) / Math.log(1 + r));
  }

  private updatePaymentsChart() {
    this.paymentsChartData.datasets[0].data = [
      Math.ceil(this.totalPrincipalPaid),
      Math.ceil(this.totalInterestPaid),
    ];

    // Refresh the chart
    if (this.paymentsChart) {
      this.paymentsChart.update();
    }
  }

  private updateEmiChart() {
    const labels = this.amortizationSchedule.map((payment) => payment.month);
    const principalData = this.amortizationSchedule.map(
      (payment) => payment.principal,
    );
    const interestData = this.amortizationSchedule.map(
      (payment) => payment.interest,
    );

    this.emiChartData.labels = labels;
    this.emiChartData.datasets[0].data = principalData;
    this.emiChartData.datasets[1].data = interestData;

    // Refresh the chart
    if (this.emiChart) {
      this.emiChart.update();
    }
  }

  private updateRevisionChart() {
    const labels = this.amortizationSchedule.map((payment) => payment.month);

    // Initialize data arrays
    const rateChangeData = new Array(this.amortizationSchedule.length);

    let currentRate = this.annualInterestRate;
    let rateChangeIndex = 0;

    // Fill rateChangeData with the interest rate for each month
    for (let i = 0; i < this.amortizationSchedule.length; i++) {
      const month = i + 1;

      // Update currentRate if there's a rate change in this month
      if (
        rateChangeIndex < this.rateChanges.length &&
        month === this.rateChanges[rateChangeIndex].month
      ) {
        currentRate = this.rateChanges[rateChangeIndex].newRate;
        rateChangeIndex++;
      }
      rateChangeData[i] = currentRate;
    }

    this.revisionsChartData.labels = labels;
    this.revisionsChartData.datasets[0].data = rateChangeData;

    // Refresh the chart
    if (this.revisionChart) {
      this.revisionChart.update();
    }
  }

  private resetDatepicker() {
    this.datepicker?.setDate(Date.now(), { clear: true });
  }

  private initDatePicker() {
    if (this.loanStartDateInput) {
      this.datepicker = new Datepicker(this.loanStartDateInput.nativeElement, {
        autohide: true,
        format: 'dd/mm/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        todayHighlight: true,
      });

      this.loanStartDateInput.nativeElement.addEventListener(
        'changeDate',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const dateFragments = e.target.value.split('/');

          this.loanStartDate = new Date(
            `${dateFragments[2]}/${dateFragments[1]}/${dateFragments[0]}`,
          );
        },
      );

      this.resetDatepicker();
    }
  }
}
