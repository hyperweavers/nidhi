import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { VendorCode } from '../adapters/market.adapter';
import { Constants } from '../constants';
import { db } from '../db/app.db';
import { ScripCode } from '../models/stock';
import { WatchList, WatchListStock } from '../models/watch-list';

@Injectable({
  providedIn: 'root',
})
export class WatchListService {
  public readonly watchLists$: Observable<WatchList[]> = from(
    liveQuery(() => db.watchLists.toArray()),
  );

  public readonly watchListStocksAll$: Observable<WatchListStock[]> = from(
    liveQuery(() => db.watchListStocks.toArray()),
  );

  public getWatchList$(id: string): Observable<WatchList | undefined> {
    return from(liveQuery(() => db.watchLists.get(id)));
  }

  public getWatchListStocks$(
    watchListId: string,
  ): Observable<WatchListStock[]> {
    return from(
      liveQuery(() =>
        db.watchListStocks.where('watchListId').equals(watchListId).toArray(),
      ),
    );
  }

  public async ensureDefaultWatchList(): Promise<string | undefined> {
    const allLists = await db.watchLists.toArray();
    const defaultList = allLists.find((l) => l.isDefault);

    if (defaultList) {
      return defaultList.id;
    }

    if (allLists.length > 0) {
      await db.watchLists.update(allLists[0].id, { isDefault: true });
      return allLists[0].id;
    }

    const id = uuid();
    await db.watchLists.add({
      id,
      name: Constants.configs.defaults.WATCH_LIST_NAME,
      isDefault: true,
      createdAt: Date.now(),
    });
    return id;
  }

  public async createWatchList(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name is required!');
    }

    const existing = await db.watchLists
      .where('name')
      .equalsIgnoreCase(trimmed)
      .first();
    if (existing) {
      throw new Error('A watch list with this name already exists!');
    }

    const id = uuid();
    await db.watchLists.add({
      id,
      name: trimmed,
      isDefault: false,
      createdAt: Date.now(),
    });
    return id;
  }

  public async renameWatchList(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name is required!');
    }

    const existing = await db.watchLists
      .where('name')
      .equalsIgnoreCase(trimmed)
      .first();
    if (existing && existing.id !== id) {
      throw new Error('A watch list with this name already exists!');
    }

    await db.watchLists.update(id, { name: trimmed });
  }

  public async deleteWatchList(id: string): Promise<void> {
    const list = await db.watchLists.get(id);
    if (!list) {
      throw new Error('Watch list not found!');
    }
    if (list.isDefault) {
      throw new Error('Cannot delete the default watch list!');
    }

    await db.transaction('rw', db.watchLists, db.watchListStocks, async () => {
      await db.watchListStocks.where('watchListId').equals(id).delete();
      await db.watchLists.delete(id);
    });
  }

  public async setDefaultWatchList(id: string): Promise<void> {
    const list = await db.watchLists.get(id);
    if (!list) {
      throw new Error('Watch list not found!');
    }

    await db.transaction('rw', db.watchLists, async () => {
      const allLists = await db.watchLists.toArray();
      for (const l of allLists) {
        if (l.isDefault && l.id !== id) {
          await db.watchLists.update(l.id, { isDefault: false });
        }
      }
      await db.watchLists.update(id, { isDefault: true });
    });
  }

  public async addStock(
    watchListId: string,
    scripCode: ScripCode,
    vendorCode: VendorCode,
  ): Promise<void> {
    if (!scripCode.isin) {
      throw new Error('Stock must have an ISIN code!');
    }

    const exists = await db.watchListStocks
      .where('[watchListId+scripCode.isin]')
      .equals([watchListId, scripCode.isin])
      .first();

    if (exists) {
      throw new Error('Stock is already in this watch list!');
    }

    await db.watchListStocks.add({
      watchListId,
      scripCode,
      vendorCode,
      addedAt: Date.now(),
    });
  }

  public async addStockToMultipleLists(
    listIds: string[],
    scripCode: ScripCode,
    vendorCode: VendorCode,
  ): Promise<void> {
    for (const listId of listIds) {
      try {
        await this.addStock(listId, scripCode, vendorCode);
      } catch {
        // Skip if already exists
      }
    }
  }

  public async removeStock(watchListId: string, isin: string): Promise<void> {
    const stock = await db.watchListStocks
      .where('[watchListId+scripCode.isin]')
      .equals([watchListId, isin])
      .first();

    if (stock?.id) {
      await db.watchListStocks.delete(stock.id);
    }
  }

  public async moveStock(
    fromListId: string,
    toListId: string,
    scripCode: ScripCode,
    vendorCode: VendorCode,
  ): Promise<void> {
    await db.transaction('rw', db.watchListStocks, async () => {
      await this.removeStock(fromListId, scripCode.isin || '');
      await this.addStock(toListId, scripCode, vendorCode);
    });
  }

  public async getListsWithoutStock(
    isin: string,
    excludeListId?: string,
  ): Promise<WatchList[]> {
    const allLists = await db.watchLists.toArray();

    const listsWithStock = await db.watchListStocks
      .where('watchListId')
      .anyOf(allLists.map((l) => l.id))
      .filter((s) => s.scripCode?.isin === isin)
      .toArray();

    const listIdsWithStock = new Set(listsWithStock.map((s) => s.watchListId));

    return allLists.filter(
      (l) =>
        !listIdsWithStock.has(l.id) &&
        (!excludeListId || l.id !== excludeListId),
    );
  }
}
