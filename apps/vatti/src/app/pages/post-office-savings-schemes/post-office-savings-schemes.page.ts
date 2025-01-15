import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { addDays, yearsToDays } from 'date-fns';

import { Flowbite } from '../../decorators/flowbite.decorator';
import {
  PostOfficeSavingsScheme,
  PostOfficeSavingsSchemeReturns,
  PostOfficeSavingsSchemeTitle,
  Returns,
} from '../../models/deposit';
import { DataService } from '../../services/core/data.service';
import { DateUtils } from '../../utils/date.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum Tabs {
  EARNING_COMPARISON,
  SCHEME_COMPARISON,
}

@Flowbite()
@UntilDestroy()
@Component({
  selector: 'app-post-office-savings-schemes',
  templateUrl: './post-office-savings-schemes.page.html',
  styleUrl: './post-office-savings-schemes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe, DatePipe],
})
export class PostOfficeSavingsSchemesPage implements OnInit {
  @ViewChild('investmentStartDateInput', { static: true })
  private investmentStartDateInput?: ElementRef;

  private eligibleSchemes = [
    PostOfficeSavingsSchemeTitle.TD,
    PostOfficeSavingsSchemeTitle.MIA,
    PostOfficeSavingsSchemeTitle.NSC,
    PostOfficeSavingsSchemeTitle.PPF,
    PostOfficeSavingsSchemeTitle.KVP,
  ];

  readonly PostOfficeSavingsSchemeTitle = PostOfficeSavingsSchemeTitle;
  readonly Tabs = Tabs;

  eligibleForScss = false;
  eligibleForMssc = false;
  eligibleForSsa = false;

  depositAmount = 100000;
  investmentStartDate: Date = new Date();

  schemes: PostOfficeSavingsScheme[] = [];
  schemesWithReturns: PostOfficeSavingsSchemeReturns[] = [];

  activeTab: Tabs = Tabs.EARNING_COMPARISON;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor(dataService: DataService, cdr: ChangeDetectorRef) {
    dataService.postOfficeSavingsSchemes$
      .pipe(untilDestroyed(this))
      .subscribe(({ schemes }) => {
        this.schemes = schemes;

        this.calculateMaturityAmount();

        cdr.markForCheck();
      });
  }

  ngOnInit() {
    this.initDatePicker();
  }

  onEligibleForScssChange(isEligible: boolean) {
    this.eligibleForScss = isEligible;

    if (isEligible) {
      this.eligibleSchemes.push(PostOfficeSavingsSchemeTitle.SCSS);
    } else {
      this.eligibleSchemes = this.eligibleSchemes.filter(
        (scheme) => scheme !== PostOfficeSavingsSchemeTitle.SCSS,
      );
    }

    this.calculateMaturityAmount();
  }

  onEligibleForMsscChange(isEligible: boolean) {
    this.eligibleForMssc = isEligible;

    if (isEligible) {
      this.eligibleSchemes.push(PostOfficeSavingsSchemeTitle.MSSC);
    } else {
      this.eligibleSchemes = this.eligibleSchemes.filter(
        (scheme) => scheme !== PostOfficeSavingsSchemeTitle.MSSC,
      );
    }

    this.calculateMaturityAmount();
  }

  onEligibleForSsaChange(isEligible: boolean) {
    this.eligibleForSsa = isEligible;

    if (isEligible) {
      this.eligibleSchemes.push(PostOfficeSavingsSchemeTitle.SSA);
    } else {
      this.eligibleSchemes = this.eligibleSchemes.filter(
        (scheme) => scheme !== PostOfficeSavingsSchemeTitle.SSA,
      );
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

  calculateMaturityAmount() {
    const schemes = this.schemes.filter((scheme) =>
      this.eligibleSchemes.includes(scheme.title),
    );

    if (schemes.length > 0) {
      this.schemesWithReturns = schemes
        .map((scheme) => ({
          ...scheme,
          tenure:
            scheme.title === PostOfficeSavingsSchemeTitle.KVP
              ? this.calculateKvpTenure(
                  scheme.interestRate,
                  DateUtils.compoundingFrequencyStringToValue(
                    scheme.compoundingFrequency,
                  ),
                )
              : scheme.tenure,
          returns:
            scheme.title === PostOfficeSavingsSchemeTitle.KVP
              ? {
                  principal: this.depositAmount,
                  interest: this.depositAmount,
                  maturity: 2 * this.depositAmount,
                }
              : this.calculateSchemeReturns(
                  scheme.interestRate,
                  scheme.tenure,
                  scheme.compounding,
                  scheme.compounding
                    ? DateUtils.compoundingFrequencyStringToValue(
                        scheme.compoundingFrequency,
                      )
                    : undefined,
                ),
        }))
        .map((schemesWithReturns) => ({
          ...schemesWithReturns,
          // Simple interest rate that would yield the same total interest
          // over the same time period
          effectiveYield:
            (schemesWithReturns.returns.interest /
              (schemesWithReturns.returns.principal *
                schemesWithReturns.tenure)) *
            100,
          maturityDate: addDays(
            this.investmentStartDate,
            yearsToDays(schemesWithReturns.tenure),
          ),
        }))
        .sort(
          // Sort based on average interest earned per month
          (s1, s2) =>
            s2.returns.interest / (s2.tenure * 12) -
            s1.returns.interest / (s1.tenure * 12),
        );
    }
  }

  private calculateSchemeReturns(
    interestRate: number,
    tenure: number,
    compounding: boolean,
    compoundingFrequency = 1,
  ): Returns {
    const principal = this.depositAmount;
    let interest;
    let maturity;

    if (compounding) {
      // Formula: M = P * Math.pow((1 + ((r/100)/n)), (n*t))
      maturity =
        principal *
        Math.pow(
          1 + interestRate / 100 / compoundingFrequency,
          compoundingFrequency * tenure,
        );
      interest = maturity - principal;
    } else {
      // Formula: M = P * (1 + ((r/100) * t))
      maturity = principal * (1 + (interestRate / 100) * tenure);
      interest = maturity - principal;
    }

    return {
      principal: this.depositAmount,
      interest,
      maturity,
    };
  }

  private calculateKvpTenure(
    interestRate: number,
    compoundingFrequency: number,
  ): number {
    const principal = this.depositAmount;
    const maturity = 2 * principal; // Maturity is double the principal

    const tenure =
      Math.log(maturity / principal) /
      (compoundingFrequency *
        Math.log(1 + interestRate / (100 * compoundingFrequency)));

    return tenure;
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
