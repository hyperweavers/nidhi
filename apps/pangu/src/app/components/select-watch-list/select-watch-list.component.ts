import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Constants } from '../../constants';
import { WatchList } from '../../models/watch-list';
import { WatchListService } from '../../services/watch-list.service';

export enum WatchListSelectionMode {
  SINGLE = 'single',
  MULTI = 'multi',
}

@UntilDestroy()
@Component({
  selector: 'app-select-watch-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './select-watch-list.component.html',
  styleUrl: './select-watch-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectWatchListComponent {
  private readonly watchListService = inject(WatchListService);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly mode = input<WatchListSelectionMode>(
    WatchListSelectionMode.SINGLE,
  );
  public readonly excludeListId = input<string | undefined>();
  public readonly stockIsin = input<string | undefined>();
  public readonly placeholderText = input<string>('Search watch lists...');
  public readonly showAsDropdown = input(false);
  public readonly selectedListId = input<string | undefined>();
  public readonly inline = input(false);

  public readonly selected = output<WatchList | WatchList[]>();
  public readonly cancelled = output<void>();

  public readonly searchQuery = signal('');
  public readonly showDropdown = signal(false);
  public readonly selectedIds = signal<Set<string>>(new Set());
  public readonly loading = signal(true);

  public readonly allLists = signal<WatchList[]>([]);

  public readonly filteredLists = signal<WatchList[]>([]);
  public readonly showTypeahead = signal(false);

  public readonly selectedListName = computed(() => {
    const id = this.selectedListId();

    if (!id) return '';

    return this.allLists().find((l) => l.id === id)?.name || '';
  });

  private readonly searchInput = viewChild<ElementRef>('searchInput');

  public readonly WatchListSelectionMode = WatchListSelectionMode;

  constructor() {
    this.watchListService.watchLists$
      .pipe(untilDestroyed(this))
      .subscribe((lists) => {
        this.loading.set(false);

        if (this.mode() === WatchListSelectionMode.MULTI && this.stockIsin()) {
          this.watchListService
            .getListsWithoutStock(this.stockIsin() || '', this.excludeListId())
            .then((filtered) => {
              this.allLists.set(filtered);
              this.filterLists(this.searchQuery());

              const defaultList = filtered.find((l) => l.isDefault);
              if (defaultList) {
                this.selectedIds.update((s) => {
                  s.add(defaultList.id);

                  return new Set(s);
                });
              }

              this.cdr.markForCheck();
            });
        } else {
          let filtered = lists;

          if (this.excludeListId()) {
            filtered = filtered.filter((l) => l.id !== this.excludeListId());
          }

          if (this.stockIsin()) {
            this.watchListService
              .getListsWithoutStock(
                this.stockIsin() || '',
                this.excludeListId(),
              )
              .then((withoutStock) => {
                const withoutIds = new Set(withoutStock.map((l) => l.id));

                filtered = lists.filter((l) => withoutIds.has(l.id));

                if (this.excludeListId()) {
                  filtered = filtered.filter(
                    (l) => l.id !== this.excludeListId(),
                  );
                }

                this.allLists.set(filtered);
                this.filterLists(this.searchQuery());

                this.cdr.markForCheck();
              });
          } else {
            this.allLists.set(filtered);
            this.filterLists(this.searchQuery());
          }
        }

        this.cdr.markForCheck();
      });

    toObservable(this.searchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
      )
      .subscribe((query) => {
        this.filterLists(query);

        this.cdr.markForCheck();
      });
  }

  public selectList(list: WatchList): void {
    this.showDropdown.set(false);
    this.searchQuery.set(list.name);
    this.selected.emit(list);

    if (this.showAsDropdown() && this.selectedListId()) {
      this.closeTypeahead();
    }
  }

  public openTypeahead(): void {
    this.searchQuery.set('');
    this.showTypeahead.set(true);
    this.showDropdown.set(true);

    setTimeout(() => this.searchInput()?.nativeElement?.focus(), 50);
  }

  public closeTypeahead(): void {
    this.showTypeahead.set(false);
    this.showDropdown.set(false);
    this.searchQuery.set('');
  }

  public toggleList(id: string): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  public confirmSelection(): void {
    const ids = Array.from(this.selectedIds());
    const selected = this.allLists().filter((l) => ids.includes(l.id));
    this.selected.emit(selected);
  }

  public onBlur(): void {
    setTimeout(() => {
      this.showDropdown.set(false);

      if (this.showAsDropdown() && this.selectedListId()) {
        this.closeTypeahead();
      }
    }, 200);
  }

  private filterLists(query: string): void {
    const q = query.toLowerCase();

    this.filteredLists.set(
      this.allLists().filter((l) => !q || l.name.toLowerCase().includes(q)),
    );
  }
}
