import { Injectable, inject } from '@angular/core';
import { LOGGER } from '@nidhi/shared-logger';
import { liveQuery } from 'dexie';
import { Observable, catchError, from, map, of, shareReplay } from 'rxjs';
import { v4 as uuid } from 'uuid';

import {
  extractPropertyNames,
  mapPreviewResponse,
} from '../adapters/market.adapter';
import { db } from '../db/app.db';
import { Screener, ScreenerPreviewResult } from '../models/screener';
import { MarketService } from './core/market.service';

@Injectable({ providedIn: 'root' })
export class ScreenerService {
  private readonly marketService = inject(MarketService);
  private readonly logger = inject(LOGGER);

  private cached$?: Observable<string[]>;

  public readonly screeners$: Observable<Screener[]> = from(
    liveQuery(() => db.screeners.toArray()),
  );

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
        map((res) => extractPropertyNames(res)),
        catchError((error) => {
          this.logger.error(`Failed to load screener properties: ${error}`);
          return of([]);
        }),
        shareReplay(1),
      );
    }
    return this.cached$;
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
