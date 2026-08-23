import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  switchMap,
} from 'rxjs';

import { ToastService } from '@nidhi/shared-toast';
import { Constants } from '../../constants';
import { Direction } from '../../models/market';
import { Stock } from '../../models/stock';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { WatchListService } from '../../services/watch-list.service';

@UntilDestroy()
@Component({
  selector: 'app-create-watch-list-wizard',
  imports: [CommonModule, FormsModule, ValueOrPlaceholderPipe],
  templateUrl: './create-watch-list-wizard.component.html',
  styleUrl: './create-watch-list-wizard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateWatchListWizardComponent {
  private readonly watchListService = inject(WatchListService);
  private readonly marketService = inject(MarketService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly closed = output<void>();
  public readonly created = output<string>();

  public readonly step = signal(1);
  public readonly error = signal('');
  public readonly stockSearchQuery = signal('');
  public readonly stockSearchResults = signal<Stock[]>([]);
  public readonly selectedStocks = signal<Stock[]>([]);
  public readonly loading = signal(false);

  public listName = '';

  public readonly Direction = Direction;

  private createdListId = '';

  constructor() {
    toObservable(this.stockSearchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        filter((q) => q.length >= Constants.configs.defaults.MIN_SEARCH_CHARS),
        switchMap((query) => this.marketService.search(query)),
      )
      .subscribe((results) => {
        const selectedIds = new Set(
          this.selectedStocks().map((s) => s.vendorCode.etm.primary),
        );
        this.stockSearchResults.set(
          results.filter((r) => !selectedIds.has(r.vendorCode.etm.primary)),
        );

        this.cdr.markForCheck();
      });

    toObservable(this.stockSearchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        filter((q) => q.length < Constants.configs.defaults.MIN_SEARCH_CHARS),
      )
      .subscribe(() => {
        this.stockSearchResults.set([]);

        this.cdr.markForCheck();
      });
  }

  public async addAndExit(): Promise<void> {
    try {
      this.createdListId = await this.watchListService.createWatchList(
        this.listName,
      );
      await this.addSelectedStocks();

      this.toastService.show('Watch list created successfully!');
      this.created.emit(this.createdListId);
    } catch (e) {
      this.error.set((e as Error).message);

      this.cdr.markForCheck();
    }
  }

  public async goToStep2(): Promise<void> {
    this.error.set('');

    if (!this.listName.trim()) {
      this.error.set('Name is required!');

      this.cdr.markForCheck();

      return;
    }

    this.step.set(2);
    this.cdr.markForCheck();
  }

  public backToStep1(): void {
    this.step.set(1);
  }

  public isStockSelected(stock: Stock): boolean {
    return this.selectedStocks().some(
      (s) => s.vendorCode.etm.primary === stock.vendorCode.etm.primary,
    );
  }

  public toggleStock(stock: Stock): void {
    if (this.isStockSelected(stock)) {
      this.removeStock(stock);
    } else {
      this.selectedStocks.update((list) => [...list, stock]);

      this.stockSearchResults.update((results) =>
        results.filter(
          (r) => r.vendorCode.etm.primary !== stock.vendorCode.etm.primary,
        ),
      );
    }
  }

  public removeStock(stock: Stock): void {
    this.selectedStocks.update((list) =>
      list.filter(
        (s) => s.vendorCode.etm.primary !== stock.vendorCode.etm.primary,
      ),
    );

    this.stockSearchResults.update((results) => {
      if (
        !results.find(
          (r) => r.vendorCode.etm.primary === stock.vendorCode.etm.primary,
        )
      ) {
        return [...results, stock];
      }

      return results;
    });
  }

  public async finish(): Promise<void> {
    try {
      this.createdListId = await this.watchListService.createWatchList(
        this.listName,
      );
    } catch (e) {
      this.error.set((e as Error).message);

      this.cdr.markForCheck();

      return;
    }

    await this.addSelectedStocks();

    this.toastService.show('Watch list created successfully!');
    this.created.emit(this.createdListId);
  }

  public cancel(): void {
    this.closed.emit();
  }

  private async addSelectedStocks(): Promise<void> {
    for (const stock of this.selectedStocks()) {
      try {
        const enriched = await firstValueFrom(
          this.marketService.getStock(stock.vendorCode.etm.primary, true),
        );

        if (enriched?.scripCode?.isin) {
          await this.watchListService.addStock(
            this.createdListId,
            enriched.scripCode,
            enriched.vendorCode,
          );
        }
      } catch {
        // Skip
      }
    }
  }
}
