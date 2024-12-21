import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
  NgApexchartsModule,
} from 'ng-apexcharts';

import {
  Amortization,
  FinancialYearSummary,
  InterestRateRevision,
  InterestRateType,
  Prepayment,
  RevisionAdjustmentType,
} from '../../models/loan';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  AMORTIZATION_SCHEDULE,
  FINANCIAL_YEAR_SUMMARY,
  CHARTS,
}

type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  yaxis: ApexYAxis;
  grid: ApexGrid;
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  colors: string[];
  chart: ApexChart;
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
  grid: ApexGrid;
  labels: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
};

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './loan-emi-calculator.page.html',
  styleUrl: './loan-emi-calculator.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanEmiCalculatorPage implements OnInit {
  @ViewChild('loanStartDateInput', { static: true })
  private loanStartDateInput?: ElementRef;
  @ViewChild('chart', { static: false }) chart!: ChartComponent;

  readonly PAGE_SIZE = 12;

  readonly InterestRateType = InterestRateType;
  readonly RevisionAdjustmentType = RevisionAdjustmentType;
  readonly Tabs = Tabs;

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

  totalPrincipalPaid = 0;
  totalInterestPaid = 0;
  totalPayments = 0;

  rateChangeMonth = 1;
  rateChangeNewRate = 0;
  rateChangeAdjustmentType: RevisionAdjustmentType =
    RevisionAdjustmentType.TENURE;

  prepaymentMonth = 1;
  prepaymentAmount = 0;
  prepaymentAdjustmentType: RevisionAdjustmentType =
    RevisionAdjustmentType.TENURE;

  activeTab = Tabs.CHARTS;

  amortizationSchedulePage = 0;
  financialYearSummaryPage = 0;

  paymentsChartOptions: DonutChartOptions = {
    series: [],
    colors: ['#1C64F2', '#E74694'],
    chart: {
      height: 320,
      width: '100%',
      type: 'donut',
      animations: {
        enabled: false,
      },
    },
    stroke: {
      colors: ['transparent'],
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              show: true,
              fontFamily: 'Inter, sans-serif',
              offsetY: 20,
            },
            total: {
              showAlways: true,
              show: true,
              label: 'Total',
              fontFamily: 'Inter, sans-serif',
              formatter: function (w) {
                const sum = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => {
                    return a + b;
                  },
                  0,
                );
                return sum;
              },
            },
            value: {
              show: true,
              fontFamily: 'Inter, sans-serif',
              offsetY: -20,
              formatter: function (value) {
                return value;
              },
            },
          },
          size: '80%',
        },
      },
    },
    grid: {
      padding: {
        top: -2,
      },
    },
    labels: ['Principal', 'Interest'],
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'bottom',
      fontFamily: 'Inter, sans-serif',
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return `${value}`;
        },
      },
    },
    xaxis: {
      labels: {
        formatter: function (value) {
          return value;
        },
      },
      axisTicks: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
    },
  };

  emiChartOptions: LineChartOptions = {
    chart: {
      width: '100%',
      height: 400,
      offsetY: 5,
      type: 'line',
      fontFamily: 'Inter, sans-serif',
      dropShadow: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: false,
      },
    },
    tooltip: {
      enabled: true,
      x: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 6,
      curve: 'smooth',
    },
    grid: {
      show: true,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -26,
      },
    },
    legend: {
      show: true,
      position: 'bottom',
    },
    series: [
      {
        name: 'Principal',
        data: [],
        color: '#1A56DB',
      },
      {
        name: 'Interest',
        data: [],
        color: '#7E3AF2',
      },
    ],
    xaxis: {
      type: 'numeric',
      labels: {
        rotate: 0,
        show: true,
        style: {
          fontFamily: 'Inter, sans-serif',
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tickAmount: 20,
      title: {
        text: 'Month',
        offsetY: -5,
        style: {
          fontFamily: 'Inter, sans-serif',
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400',
        },
      },
    },
    yaxis: {
      labels: {
        show: true,
        style: {
          fontFamily: 'Inter, sans-serif',
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400',
        },
      },
      title: {
        text: 'Amount',
        offsetY: -25,
        style: {
          fontFamily: 'Inter, sans-serif',
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400',
        },
      },
    },
  };

  revisionChartOptions: LineChartOptions = {
    ...this.emiChartOptions,
    series: [
      {
        ...this.emiChartOptions.series[0],
        name: 'Interest Rate',
      },
    ],
    yaxis: {
      ...this.emiChartOptions.yaxis,
      title: {
        ...this.emiChartOptions.yaxis.title,
        text: 'Interest Rate',
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  ngOnInit() {
    this.initDatePicker();

    this.calculateAmortization();
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
      const fyString = `${fyStartDate.getFullYear()}-${(
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
    this.updateTotalPaymentsChart();
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

  private updateEmiChart() {
    const principalData = this.amortizationSchedule.map(
      (payment) => payment.principal,
    );
    const interestData = this.amortizationSchedule.map(
      (payment) => payment.interest,
    );

    this.emiChartOptions.series = [
      {
        ...this.emiChartOptions.series[0],
        data: principalData,
      },
      {
        ...this.emiChartOptions.series[1],
        data: interestData,
      },
    ];
  }

  private updateRevisionChart() {
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

    // Update the chart data
    this.revisionChartOptions.series = [
      {
        ...this.revisionChartOptions.series[0],
        data: rateChangeData,
      },
    ];
  }

  private updateTotalPaymentsChart() {
    this.paymentsChartOptions.series = [
      this.totalPrincipalPaid,
      this.totalInterestPaid,
    ];
  }

  private resetDatepicker(): void {
    this.datepicker?.setDate(Date.now(), { clear: true });
  }

  private initDatePicker(): void {
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
