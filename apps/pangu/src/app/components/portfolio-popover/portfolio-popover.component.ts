import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Popover } from 'flowbite';
import { Direction } from '../../models/market';
import { Holding } from '../../models/portfolio';

interface PopoverStat {
  label: string;
  value: string;
  direction?: Direction;
}

@Component({
  selector: 'app-portfolio-popover',
  imports: [CommonModule],
  templateUrl: './portfolio-popover.component.html',
  styleUrl: './portfolio-popover.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPopoverComponent implements AfterViewInit, OnDestroy {
  public readonly holding = input.required<Holding>();

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  private popover?: Popover;

  public readonly Direction = Direction;

  protected readonly stats = computed((): PopoverStat[] => {
    const holding = this.holding();
    return [
      {
        label: 'Avg Price',
        value: this.formatMoney(holding.averagePrice),
      },
      {
        label: 'Quantity',
        value: holding.quantity == null ? '--' : `${holding.quantity}`,
      },
      {
        label: 'Investment',
        value: this.formatMoney(holding.investment),
      },
      {
        label: 'Current Value',
        value: this.formatMoney(holding.marketValue),
      },
      {
        label: 'Total P/L',
        value: this.formatMoney(holding.totalProfitLoss?.value),
        direction: holding.totalProfitLoss?.direction,
      },
      {
        label: 'Total P/L %',
        value:
          holding.totalProfitLoss?.percentage == null
            ? '--'
            : `${holding.totalProfitLoss.percentage.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%`,
        direction: holding.totalProfitLoss?.direction,
      },
    ];
  });

  ngAfterViewInit(): void {
    const trigger = this.triggerRef()?.nativeElement;
    const panel = this.panelRef()?.nativeElement;
    if (!trigger || !panel) return;
    // Real Flowbite popover: auto placement flips to stay inside the
    // viewport, hover/tap toggles, outside click and Escape dismiss.
    this.popover = new Popover(panel, trigger, {
      placement: 'auto',
      triggerType: 'hover',
      offset: 10,
    });
  }

  ngOnDestroy(): void {
    this.popover?.destroy();
  }

  private formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '--';
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
