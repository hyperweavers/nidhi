import { CommonModule, DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ChartConfiguration, ChartData } from 'chart.js';
import { addDays, yearsToDays } from 'date-fns';
import { BaseChartDirective } from 'ng2-charts';

import {
  Flowbite,
  initFlowbiteComponents,
} from '../../decorators/flowbite.decorator';
import { ChartType } from '../../models/chart';
import {
  CompoundingFrequency,
  InterestPayoutFrequency,
  InvestmentType,
  PostOfficeSavingsScheme,
  PostOfficeSavingsSchemeId,
  PostOfficeSavingsSchemeReturns,
  PostOfficeSavingsSchemeWithReturns,
} from '../../models/deposit';
import { DataService } from '../../services/core/data.service';
import { ChartUtils } from '../../utils/chart.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  EARNING_COMPARISON,
  SCHEME_COMPARISON,
}

enum Charts {
  EARNINGS,
  INTEREST_RATE,
}

@Flowbite()
@UntilDestroy()
@Component({
  selector: 'app-post-office-savings-schemes',
  templateUrl: './post-office-savings-schemes.page.html',
  styleUrl: './post-office-savings-schemes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [DecimalPipe, DatePipe],
})
export class PostOfficeSavingsSchemesPage {
  //implements OnInit {
  @ViewChild('investmentStartDateInput', { static: false })
  private investmentStartDateInput?: ElementRef;

  @ViewChild('earningsChart', { read: BaseChartDirective })
  earningsChart!: BaseChartDirective;
  @ViewChild('interestRateChart', { read: BaseChartDirective })
  interestRateChart!: BaseChartDirective;

  @ViewChild('earningsChartContainer')
  private earningsChartContainer?: ElementRef;
  @ViewChild('interestRateChartContainer')
  private interestRateChartContainer?: ElementRef;

  readonly PostOfficeSavingsSchemeId = PostOfficeSavingsSchemeId;
  readonly InvestmentType = InvestmentType;
  readonly ChartType = ChartType;
  readonly Tabs = Tabs;
  readonly Charts = Charts;

  interestPayoutFrequencyMap: Map<number, string> = new Map(
    Object.entries(InterestPayoutFrequency)
      .filter((payoutFrequency) => typeof payoutFrequency[1] === 'number')
      .map(
        (entry) => [entry[1], entry[0].replace('ly', '')] as [number, string],
      ),
  );
  compoundingFrequencyMap: Map<number, string> = new Map(
    Object.entries(CompoundingFrequency)
      .filter(
        (compoundingFrequency) => typeof compoundingFrequency[1] === 'number',
      )
      .map((entry) => [entry[1], entry[0]] as [number, string]),
  );

  investmentType = InvestmentType.OneTime;
  depositAmount = 100000;
  investmentStartDate: Date = new Date();

  eligibleForScss = false;
  eligibleForMssc = false;
  eligibleForSsa = false;

  schemes: PostOfficeSavingsScheme[] = [];
  schemesWithReturns: PostOfficeSavingsSchemeWithReturns[] = [];

  activeTab: Tabs = Tabs.EARNING_COMPARISON;

  isChartInFullscreen = false;

  loading = true;
  error = false;

  earningsChartData: ChartData<ChartType.BAR> = {
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
        label: 'Interest',
      },
    ],
  };

  earningsChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Scheme',
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
        tooltipItems[0]?.label ? `Scheme: ${tooltipItems[0].label}` : '',
      (tooltipItems): string => {
        return tooltipItems.length > 0
          ? `Maturity: ${
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

  interestRateChartData: ChartData<ChartType.BAR> = {
    labels: [],
    datasets: [
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorBlue),
        // barThickness: undefined,
        label: 'Interest Rate',
      },
      {
        ...ChartUtils.defaultBarChartDataset,
        ...ChartUtils.getBarChartColor(ChartUtils.colorGreen),
        label: 'Effective Yield',
      },
    ],
  };

  interestRateChartOptions: ChartConfiguration['options'] =
    ChartUtils.getBarChartOptions(
      'Scheme',
      'Percentage',
      false,
      true,
      (context): string => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;

        return label && value
          ? `${label}: ${this.decimalPipe.transform(value, '1.2-2') || ''}`
          : '';
      },
      (tooltipItems): string =>
        tooltipItems[0]?.label ? `Scheme: ${tooltipItems[0].label}` : '',
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly decimalPipe: DecimalPipe,
    private cdr: ChangeDetectorRef,
    dataService: DataService,
  ) {
    dataService.postOfficeSavingsSchemes$
      .pipe(untilDestroyed(this))
      .subscribe((postOfficeSavingsSchemes) => {
        if (postOfficeSavingsSchemes) {
          this.schemes = postOfficeSavingsSchemes.schemes;
          this.error = false;

          this.calculateMaturityAmount();
        } else {
          this.schemes = [];
          this.error = true;
        }

        this.loading = false;

        this.cdr.markForCheck();

        setTimeout(() => {
          this.initDatePicker();
          initFlowbiteComponents();
        }, 100);
      });
  }

  // ngOnInit() {
  //   this.initDatePicker();
  // }

  @HostListener('window:fullscreenchange')
  onFullscreenChange() {
    this.isChartInFullscreen = !!this.document.fullscreenElement;
  }

  onInvestmentTypeChange(type: InvestmentType) {
    this.investmentType = type;

    this.eligibleForScss = false;
    this.eligibleForMssc = false;
    this.eligibleForSsa = false;

    if (this.investmentType === InvestmentType.OneTime) {
      this.depositAmount = 100000;
    } else {
      this.depositAmount = 2000;
    }

    this.calculateMaturityAmount();
  }

  onInvestmentStartDateChange(dateString: string) {
    this.investmentStartDate = new Date(dateString);

    this.calculateMaturityAmount();
  }

  onEligibleForScssChange(isEligible: boolean) {
    this.eligibleForScss = isEligible;

    this.calculateMaturityAmount();
  }

  onEligibleForMsscChange(isEligible: boolean) {
    this.eligibleForMssc = isEligible;

    this.calculateMaturityAmount();
  }

  onEligibleForSsaChange(isEligible: boolean) {
    this.eligibleForSsa = isEligible;

    this.calculateMaturityAmount();
  }

  onTabChange(tab: Tabs) {
    if (this.activeTab === Number(tab)) {
      return;
    }

    this.activeTab = Number(tab);

    initFlowbiteComponents();
  }

  toggleFullscreen(chart: Charts) {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen();
    } else {
      let container: ElementRef | undefined;

      switch (chart) {
        case Charts.EARNINGS:
          container = this.earningsChartContainer;
          break;

        case Charts.INTEREST_RATE:
          container = this.interestRateChartContainer;
          break;

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
    const schemes = this.schemes.filter((scheme) => {
      let eligible = true;

      if (this.investmentType === InvestmentType.OneTime) {
        eligible = !scheme.depositTenure;
      } else {
        eligible = !!scheme.depositTenure;
      }

      if (scheme.id === PostOfficeSavingsSchemeId.SB) {
        eligible = false;
      } else if (scheme.id === PostOfficeSavingsSchemeId.SCSS) {
        eligible = eligible && this.eligibleForScss;
      } else if (scheme.id === PostOfficeSavingsSchemeId.MSSC) {
        eligible = eligible && this.eligibleForMssc;
      } else if (scheme.id === PostOfficeSavingsSchemeId.SSA) {
        eligible = eligible && this.eligibleForSsa;
      }

      return eligible;
    });

    if (schemes.length > 0) {
      this.schemesWithReturns = schemes
        .map((scheme) => ({
          ...scheme,
          returns:
            scheme.id === PostOfficeSavingsSchemeId.KVP
              ? {
                  principal: this.depositAmount,
                  interest: this.depositAmount,
                  maturity: 2 * this.depositAmount,
                  maturityDate: addDays(
                    this.investmentStartDate,
                    yearsToDays(scheme.maturityTenure),
                  ),
                  effectiveYield:
                    (this.depositAmount /
                      (this.depositAmount * scheme.maturityTenure)) *
                    100,
                }
              : this.calculateSchemeReturns(
                  scheme.interestRate,
                  scheme.maturityTenure,
                  scheme.depositTenure,
                  scheme.interestPayoutFrequencyPerYear,
                  scheme.compoundingFrequencyPerYear,
                ),
        }))
        .sort(
          // Sort based on average interest earned per month
          (s1, s2) =>
            s2.returns.interest / (s2.maturityTenure * 12) -
            s1.returns.interest / (s1.maturityTenure * 12),
        );

      this.updateEarningsChartData();
      this.updateInterestRateChartData();
    }
  }

  private calculateSchemeReturns(
    interestRate: number,
    maturityTenure: number,
    depositTenure: number,
    interestPayoutFrequency: number,
    compoundingFrequency: number,
  ): PostOfficeSavingsSchemeReturns {
    let principal = this.depositAmount;
    let interest = 0;
    let maturity = 0;

    if (depositTenure) {
      if (compoundingFrequency === 1) {
        // PPF, SSA
        const yearlyInvestment = this.depositAmount * 12;

        let openingBalance = 0;
        let interestEarnedPerYear = 0;
        let closingBalance = 0;
        let totalInterest = 0;

        for (let year = 1; year <= maturityTenure; year++) {
          const x = year <= depositTenure ? yearlyInvestment : 0;
          openingBalance += x;
          interestEarnedPerYear = openingBalance * (interestRate / 100);
          totalInterest += interestEarnedPerYear;
          closingBalance = openingBalance + interestEarnedPerYear;
          openingBalance = closingBalance;
        }

        principal = yearlyInvestment * depositTenure;
        interest = totalInterest;
        maturity = closingBalance;
      } else {
        // RD
        // M = P * Math.pow((1 + ((r/100)/n)), (t*n))
        const totalInstallments = depositTenure * 12;

        for (let i = 0; i <= totalInstallments; i++) {
          if (i === 0) {
            maturity = principal;
          } else if (i === totalInstallments) {
            maturity +=
              principal *
                Math.pow(
                  1 + interestRate / 100 / compoundingFrequency,
                  (i / 12) * compoundingFrequency,
                ) -
              principal;
          } else {
            maturity +=
              principal *
              Math.pow(
                1 + interestRate / 100 / compoundingFrequency,
                (i / 12) * compoundingFrequency,
              );
          }
        }

        principal = this.depositAmount * totalInstallments;
        interest = maturity - principal;
      }
    } else {
      if (interestPayoutFrequency) {
        if (compoundingFrequency > interestPayoutFrequency) {
          // TD
          for (let i = 0; i < maturityTenure / interestPayoutFrequency; i++) {
            interest +=
              principal *
                Math.pow(
                  1 + interestRate / 100 / compoundingFrequency,
                  compoundingFrequency,
                ) -
              principal;
          }

          maturity = interest + principal;
        } else {
          // SCSS, MIS
          maturity = principal;
          interest =
            principal * (1 + (interestRate / 100) * maturityTenure) - principal;
        }
      } else {
        // NSC, MSSC
        // Formula: M = P * Math.pow((1 + ((r/100)/n)), (n*t))
        maturity =
          principal *
          Math.pow(
            1 + interestRate / 100 / compoundingFrequency,
            compoundingFrequency * maturityTenure,
          );
        interest = maturity - principal;
      }
    }

    return {
      principal,
      interest,
      maturity,
      maturityDate: addDays(
        this.investmentStartDate,
        yearsToDays(maturityTenure),
      ),
      effectiveYield: (interest / (principal * maturityTenure)) * 100,
    };
  }

  private updateEarningsChartData() {
    this.earningsChartData.labels = this.schemesWithReturns.map(
      (item) => item.id,
    );
    this.earningsChartData.datasets[0].data = this.schemesWithReturns.map(
      (item) => item.returns.principal,
    );
    this.earningsChartData.datasets[1].data = this.schemesWithReturns.map(
      (item) => item.returns.interest,
    );

    if (this.earningsChart) {
      this.earningsChart.update();
    }
  }

  private updateInterestRateChartData() {
    this.interestRateChartData.labels = this.schemesWithReturns.map(
      (item) => item.id,
    );
    this.interestRateChartData.datasets[0].data = this.schemesWithReturns.map(
      (item) => item.interestRate,
    );
    this.interestRateChartData.datasets[1].data = this.schemesWithReturns.map(
      (item) => item.returns.effectiveYield,
    );

    if (this.interestRateChart) {
      this.interestRateChart.update();
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
          // TODO: Until historic interest rate based calculation implemented, limiting investment start date to 30.09.2023 when interest rates last updated.
          minDate: new Date(2023, 8, 30).getTime(),
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
