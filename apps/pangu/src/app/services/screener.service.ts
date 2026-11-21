import { Injectable, inject } from '@angular/core';
import { LOGGER } from '@nidhi/shared-logger';
import { liveQuery } from 'dexie';
import {
  Observable,
  catchError,
  combineLatest,
  from,
  map,
  of,
  shareReplay,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import {
  extractPropertyNames,
  mapPreviewResponse,
} from '../adapters/market.adapter';
import { Constants } from '../constants';
import { db } from '../db/app.db';
import { uniqueEntityIds } from '../helpers/query-builder.helper';
import {
  COMPANY_NAME_PROPERTY,
  CompanyNameValue,
} from '../models/query-builder';
import { Screener, ScreenerPreviewResult } from '../models/screener';
import { MarketService } from './core/market.service';
import { PortfolioService } from './portfolio.service';
import { WatchListService } from './watch-list.service';

@Injectable({ providedIn: 'root' })
export class ScreenerService {
  private readonly marketService = inject(MarketService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly watchListService = inject(WatchListService);
  private readonly logger = inject(LOGGER);

  private cached$?: Observable<string[]>;

  public readonly screeners$: Observable<Screener[]> = from(
    liveQuery(() => db.screeners.toArray()),
  );

  /**
   * Sources offered for Company Name IN / NOT IN clauses: current holdings
   * with quantity > 0, then every watch list that actually holds stocks.
   */
  public get companyNameSources$(): Observable<CompanyNameValue[]> {
    return combineLatest([
      this.portfolioService.portfolio$,
      this.watchListService.watchLists$,
      this.watchListService.watchListStocksAll$,
    ]).pipe(
      map(([portfolio, lists, listStocks]) => {
        const options: CompanyNameValue[] = [];
        const portfolioIds = uniqueEntityIds(
          (portfolio.holdings ?? []).map((holding) =>
            (holding.quantity ?? 0) > 0
              ? holding.vendorCode?.etm?.primary
              : undefined,
          ),
        );
        if (portfolioIds.length > 0) {
          options.push({ label: 'Portfolio', entityIds: portfolioIds });
        }
        for (const list of lists) {
          const entityIds = uniqueEntityIds(
            listStocks
              .filter((stock) => stock.watchListId === list.id)
              .map((stock) => stock.vendorCode?.etm?.primary),
          );
          if (entityIds.length > 0) {
            options.push({ label: list.name, entityIds });
          }
        }
        return options;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  public getScreener$(id: string): Observable<Screener | undefined> {
    return from(liveQuery(() => db.screeners.get(id)));
  }

  public async screenerNameExists(
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const existing = await db.screeners
      .where('name')
      .equalsIgnoreCase(trimmed)
      .first();
    return Boolean(existing && existing.id !== excludeId);
  }

  public async getScreener(id: string): Promise<Screener | undefined> {
    return db.screeners.get(id);
  }

  public async createScreener(
    name: string,
    query: string,
    queryTree?: Screener['queryTree'],
  ): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name is required!');
    if (!query.trim()) throw new Error('Query is required!');

    const exists = await db.screeners
      .where('name')
      .equalsIgnoreCase(trimmed)
      .first();
    if (exists) throw new Error('A screener with this name already exists!');

    const now = Date.now();
    const id = uuid();
    await (db.screeners as any).add({
      id,
      name: trimmed,
      query: query.trim(),
      queryTree,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  public async updateScreener(
    id: string,
    query: string,
    queryTree?: Screener['queryTree'],
  ): Promise<void> {
    const existing = await db.screeners.get(id);
    if (!existing) throw new Error('Screener not found!');
    if (!query.trim()) throw new Error('Query is required!');

    await (db.screeners as any).update(id, {
      query: query.trim(),
      queryTree,
      updatedAt: Date.now(),
    });
  }

  public async renameScreener(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name is required!');
    const existing = await db.screeners
      .where('name')
      .equalsIgnoreCase(trimmed)
      .first();
    if (existing && existing.id !== id)
      throw new Error('A screener with this name already exists!');
    await (db.screeners as any).update(id, {
      name: trimmed,
      updatedAt: Date.now(),
    });
  }

  public async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const existing = await db.screeners.get(id);
    if (!existing) throw new Error('Screener not found!');
    await (db.screeners as any).update(id, {
      isFavorite,
      updatedAt: Date.now(),
    });
  }

  public async deleteScreener(id: string): Promise<void> {
    const existing = await db.screeners.get(id);
    if (!existing) throw new Error('Screener not found!');
    await db.screeners.delete(id);
  }

  /** Property display names from the screener field mapping API. */
  public getProperties(): Observable<string[]> {
    if (!this.cached$) {
      this.cached$ = this.marketService.getScreenerFieldMapping().pipe(
        map((res) =>
          [...extractPropertyNames(res), COMPANY_NAME_PROPERTY].sort((a, b) =>
            a.localeCompare(b),
          ),
        ),
        catchError((error) => {
          this.logger.error(`Failed to load screener properties: ${error}`);
          return of([]);
        }),
        shareReplay(1),
      );
    }
    return this.cached$;
  }

  /**
   * Company typeahead for Company Name clauses. Reuses the Company ID
   * already returned by the header search; no detail request is needed.
   */
  public searchCompanies(query: string): Observable<CompanyNameValue[]> {
    const trimmed = query.trim();
    if (trimmed.length < Constants.configs.defaults.MIN_SEARCH_CHARS) {
      return of([]);
    }

    return this.marketService.search(trimmed).pipe(
      map((stocks) =>
        stocks.flatMap((stock) => {
          const entityId = stock.vendorCode?.etm?.primary?.trim();
          const label = stock.name?.trim();
          if (!entityId || !label) return [];
          return [{ label, entityIds: [entityId] }];
        }),
      ),
      catchError((error) => {
        this.logger.error(`Company search failed: ${error}`);
        return of<CompanyNameValue[]>([]);
      }),
    );
  }

  public preview(
    queryCondition: string,
    options?: { pagesize?: number; pageno?: number },
  ): Observable<{ totalRecords: number; results: ScreenerPreviewResult[] }> {
    const pagesize = options?.pagesize ?? 20;
    const pageno = options?.pageno ?? 1;

    return this.marketService
      .getScreenerPreview(queryCondition, pagesize, pageno)
      .pipe(
        map((res) => ({
          totalRecords: res.totalRecords ?? 0,
          results: mapPreviewResponse(res),
        })),
        catchError((error) => {
          this.logger.error(`Screener preview failed: ${error}`);
          throw error;
        }),
      );
  }
}
