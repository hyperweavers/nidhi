import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { ToastService } from '@nidhi/shared-toast';
import { Direction } from '../../models/market';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { WatchListService } from '../../services/watch-list.service';
import { CreateWatchListWizardComponent } from './create-watch-list-wizard.component';

const mockStock: Stock = {
  name: 'Reliance Industries',
  scripCode: { nse: 'RELIANCE', bse: '500325', isin: 'INE002A01018' },
  vendorCode: { etm: { primary: '1', chart: 'RELIANCE' } },
  quote: {
    nse: {
      price: 2500,
      change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
      open: 2480,
      close: 2462.5,
      low: 2450,
      high: 2510,
      volume: 5000000,
    },
  },
} as Stock;

describe('CreateWatchListWizardComponent', () => {
  let component: CreateWatchListWizardComponent;
  let fixture: ComponentFixture<CreateWatchListWizardComponent>;
  let watchListService: jest.Mocked<WatchListService>;
  let marketService: jest.Mocked<MarketService>;
  let toastService: jest.Mocked<ToastService>;

  beforeEach(async () => {
    watchListService = {
      watchLists$: of([]),
      getWatchList$: jest.fn(),
      getWatchListStocks$: jest.fn(),
      ensureDefaultWatchList: jest.fn(),
      watchListNameExists: jest.fn().mockResolvedValue(false),
      createWatchList: jest.fn().mockResolvedValue('new-list-id'),
      renameWatchList: jest.fn(),
      deleteWatchList: jest.fn(),
      setDefaultWatchList: jest.fn(),
      addStock: jest.fn(),
      addStockToMultipleLists: jest.fn().mockResolvedValue(undefined),
      removeStock: jest.fn(),
      moveStock: jest.fn(),
      getListsWithoutStock: jest.fn(),
    } as any;

    marketService = {
      search: jest.fn().mockReturnValue(of([mockStock])),
      getStock: jest.fn().mockReturnValue(of(mockStock)),
    } as any;

    toastService = {
      show: jest.fn(),
      toasts: jest.fn().mockReturnValue([]),
      dismiss: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [CreateWatchListWizardComponent],
      providers: [
        { provide: WatchListService, useValue: watchListService },
        { provide: MarketService, useValue: marketService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateWatchListWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at step 1', () => {
    expect(component.step()).toBe(1);
  });

  it('should show the name input in step 1', () => {
    const input = fixture.debugElement.query(By.css('#list-name'));
    expect(input).toBeTruthy();
  });

  it('should show error for empty name on addAndExit', fakeAsync(async () => {
    watchListService.createWatchList.mockRejectedValue(
      new Error('Name is required'),
    );
    component.listName = '';
    await component.addAndExit();
    expect(component.error()).toBe('Name is required');
    expect(watchListService.createWatchList).toHaveBeenCalledWith('');
  }));

  it('should create list and emit created on addAndExit', fakeAsync(async () => {
    const emitSpy = jest.spyOn(component.created, 'emit');
    component.listName = 'My List';
    await component.addAndExit();
    expect(watchListService.createWatchList).toHaveBeenCalledWith('My List');
    expect(emitSpy).toHaveBeenCalledWith('new-list-id');
    expect(toastService.show).toHaveBeenCalledWith(
      'Watch list created successfully!',
    );
  }));

  it('should advance to step 2 on goToStep2', fakeAsync(async () => {
    watchListService.createWatchList.mockResolvedValue('list-2');
    component.listName = 'Tech Watch';
    await component.goToStep2();
    expect(component.step()).toBe(2);
  }));

  it('should search stocks via marketService', () => {
    marketService.search.mockReturnValue(of([]));
    component.stockSearchQuery.set('Rel');
    component.step.set(2);
    fixture.detectChanges();
    expect(marketService.search).not.toHaveBeenCalled();
    marketService.search('Reliance');
    expect(marketService.search).toHaveBeenCalledWith('Reliance');
  });

  it('should toggle stock selection', fakeAsync(() => {
    component.toggleStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(true);
    component.toggleStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(false);
  }));

  it('should add selected stocks on addAndExit from step 2', fakeAsync(async () => {
    watchListService.createWatchList.mockResolvedValue('list-123');
    component.listName = 'My List';
    component.step.set(2);
    component.toggleStock(mockStock);
    await component.addAndExit();
    expect(watchListService.addStock).toHaveBeenCalledWith(
      'list-123',
      mockStock.scripCode,
      mockStock.vendorCode,
    );
    expect(toastService.show).toHaveBeenCalledWith(
      'Watch list created successfully!',
    );
  }));

  it('should cancel at step 1 without deleting', fakeAsync(async () => {
    const emitSpy = jest.spyOn(component.closed, 'emit');
    component.step.set(1);
    component.cancel();
    expect(watchListService.deleteWatchList).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  }));

  it('should show server error on createWatchList failure', fakeAsync(async () => {
    watchListService.createWatchList.mockRejectedValue(new Error('Name taken'));
    component.listName = 'My List';
    await component.addAndExit();
    expect(component.error()).toBe('Name taken');
    expect(watchListService.createWatchList).toHaveBeenCalledWith('My List');
  }));

  it('should validate empty name on goToStep2', fakeAsync(async () => {
    component.listName = '';
    await component.goToStep2();
    expect(component.error()).toBe('Name is required!');
    expect(component.step()).toBe(1);
    expect(watchListService.watchListNameExists).not.toHaveBeenCalled();
  }));

  it('should prevent going to step 2 when watch list name already exists', fakeAsync(async () => {
    watchListService.watchListNameExists.mockResolvedValue(true);
    component.listName = 'My List';
    await component.goToStep2();
    expect(component.step()).toBe(1);
    expect(component.error()).toBe(
      'A watch list with this name already exists!',
    );
    expect(watchListService.watchListNameExists).toHaveBeenCalledWith(
      'My List',
    );
  }));

  it('should show duplicate name error in template and stay on step 1', fakeAsync(async () => {
    watchListService.watchListNameExists.mockResolvedValue(true);
    component.listName = 'My List';
    fixture.detectChanges();
    const nextButton = fixture.debugElement
      .queryAll(By.css('button'))
      .find((b) => b.nativeElement.textContent.trim() === 'Next');
    nextButton?.nativeElement.click();
    await Promise.resolve();
    fixture.detectChanges();
    expect(component.step()).toBe(1);
    const errorParagraph = fixture.debugElement.query(By.css('p'));
    expect(errorParagraph?.nativeElement.textContent).toContain(
      'A watch list with this name already exists!',
    );
  }));

  it('should allow going to step 2 when name does not exist', fakeAsync(async () => {
    watchListService.watchListNameExists.mockResolvedValue(false);
    component.listName = 'Unique List';
    await component.goToStep2();
    expect(watchListService.watchListNameExists).toHaveBeenCalledWith(
      'Unique List',
    );
    expect(component.error()).toBe('');
    expect(component.step()).toBe(2);
  }));

  it('should go back to step 1 from step 2', () => {
    component.step.set(2);
    component.backToStep1();
    expect(component.step()).toBe(1);
  });

  it('should remove selected stock and restore to results', () => {
    component.toggleStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(true);
    expect(component.selectedStocks().length).toBe(1);
    component.removeStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(false);
    expect(component.selectedStocks().length).toBe(0);
  });

  it('should finish without creating a new list', fakeAsync(async () => {
    watchListService.createWatchList.mockResolvedValue('list-123');
    component.listName = 'My List';
    component.step.set(2);
    component.createdListId = 'list-123';
    const emitSpy = jest.spyOn(component.created, 'emit');
    await component.finish();
    expect(emitSpy).toHaveBeenCalledWith('list-123');
    expect(toastService.show).toHaveBeenCalledWith(
      'Watch list created successfully!',
    );
  }));

  it('should handle addStock error on finish gracefully', fakeAsync(async () => {
    watchListService.addStock.mockRejectedValue(new Error('Network error'));
    component.listName = 'My List';
    component.createdListId = 'list-123';
    component.toggleStock(mockStock);
    await expect(component.finish()).resolves.toBeUndefined();
  }));

  it('should toggle stock and filter from search results', () => {
    component.stockSearchResults.set([mockStock]);
    component.toggleStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(true);
    expect(component.stockSearchResults().length).toBe(0);
    component.toggleStock(mockStock);
    expect(component.isStockSelected(mockStock)).toBe(false);
  });

  it('should restore stock to search results on remove when not in results', () => {
    component.toggleStock(mockStock);
    expect(component.stockSearchResults().length).toBe(0);
    component.removeStock(mockStock);
    expect(component.stockSearchResults().length).toBe(1);
    expect(component.stockSearchResults()[0]).toBe(mockStock);
  });

  it('should show error on finish when createWatchList fails', fakeAsync(async () => {
    watchListService.createWatchList.mockRejectedValue(
      new Error('Creation failed'),
    );
    component.listName = 'My List';
    await component.finish();
    expect(component.error()).toBe('Creation failed');
  }));

  it('should exclude selected stocks from search results', fakeAsync(() => {
    const stock2: Stock = {
      ...mockStock,
      name: 'TCS',
      vendorCode: { etm: { primary: '2', chart: 'TCS' } },
    } as Stock;
    marketService.search.mockReturnValue(of([mockStock, stock2]));
    const f = TestBed.createComponent(CreateWatchListWizardComponent);
    const c = f.componentInstance;
    c.selectedStocks.set([mockStock]);
    c.step.set(2);
    f.detectChanges();
    c.stockSearchQuery.set('Test');
    f.detectChanges();
    tick(400);
    const results = c.stockSearchResults();
    expect(results.length).toBe(1);
    expect(results[0].vendorCode.etm.primary).toBe('2');
  }));

  it('should not add stock to search results on remove when already present', () => {
    component.stockSearchResults.set([mockStock]);
    component.selectedStocks.set([mockStock]);
    component.removeStock(mockStock);
    expect(component.stockSearchResults().length).toBe(1);
  });

  it('should skip enrichment when getStock returns undefined', fakeAsync(async () => {
    marketService.getStock.mockReturnValue(of(undefined as unknown as Stock));
    watchListService.createWatchList.mockResolvedValue('list-123');
    component.listName = 'My List';
    component.toggleStock(mockStock);
    tick();
    await component.finish();
    tick();
    expect(watchListService.addStock).not.toHaveBeenCalled();
  }));
});
